#!/usr/bin/env bash

set -Eeuo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
workspace_root="$(cd -- "$script_dir/../../.." && pwd)"
mobile_dir="$workspace_root/my-happy-wallet-frontend/mobile"
compose_file="$workspace_root/docker-compose.dev.yml"
metro_compose_file="$mobile_dir/compose.dev-client.yml"

config_home="${XDG_CONFIG_HOME:-${HOME}/.config}"
android_sdk_root="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-$config_home/android-sdk}}"
adb_bin="$android_sdk_root/platform-tools/adb"
emulator_bin="$android_sdk_root/emulator/emulator"

avd_name=""
build_stack=false
install_app=false
metro_status_url="http://localhost:8081/status"

usage() {
  cat <<'EOF'
Usage: start-android-dev.sh [options]

Options:
  --avd NAME       Demarre cet AVD si aucun appareil n'est connecte.
  --build-stack    Reconstruit les images de la stack Docker locale.
  --install        Recompile et reinstalle le development build Android.
  -h, --help       Affiche cette aide.

Exemples:
  ./mobile/scripts/start-android-dev.sh
  ./mobile/scripts/start-android-dev.sh --avd Pixel_5_API_35_Light
  ./mobile/scripts/start-android-dev.sh --build-stack --install
EOF
}

while (($# > 0)); do
  case "$1" in
    --avd)
      [[ $# -ge 2 ]] || {
        echo "Erreur: --avd attend un nom." >&2
        exit 2
      }
      avd_name="$2"
      shift 2
      ;;
    --build-stack)
      build_stack=true
      shift
      ;;
    --install)
      install_app=true
      shift
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "Erreur: option inconnue: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

require_command() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Erreur: commande introuvable: $1" >&2
    exit 1
  }
}

has_online_device() {
  "$adb_bin" devices | awk 'NR > 1 && $2 == "device" { found = 1 } END { exit !found }'
}

wait_for_device() {
  echo "Attente de l'emulateur Android..."
  for _ in {1..180}; do
    if has_online_device; then
      "$adb_bin" wait-for-device
      while [[ "$("$adb_bin" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" != "1" ]]; do
        sleep 1
      done
      echo "Emulateur pret."
      return 0
    fi
    sleep 1
  done
  echo "Erreur: aucun appareil Android disponible apres 180 secondes." >&2
  return 1
}

[[ -x "$adb_bin" ]] || {
  echo "Erreur: ADB recent introuvable: $adb_bin" >&2
  echo "Definis ANDROID_SDK_ROOT vers ton SDK Android XDG." >&2
  exit 1
}
[[ -f "$compose_file" ]] || {
  echo "Erreur: workspace My Happy Wallet introuvable depuis $script_dir" >&2
  exit 1
}
[[ -f "$metro_compose_file" ]] || {
  echo "Erreur: configuration Metro introuvable: $metro_compose_file" >&2
  exit 1
}
[[ -d "$mobile_dir/node_modules/expo" ]] || {
  echo "Erreur: dependances mobiles absentes." >&2
  echo "Execute d'abord npm ci dans le service agent-frontend-node." >&2
  exit 1
}

require_command docker
require_command curl
require_command awk

if ! has_online_device; then
  "$adb_bin" start-server >/dev/null
fi

if ! has_online_device; then
  if [[ -z "$avd_name" ]]; then
    echo "Aucun appareil Android connecte." >&2
    echo "Demarre un appareil dans Android Studio > Device Manager," >&2
    echo "ou relance le script avec --avd NOM." >&2
    if [[ -x "$emulator_bin" ]]; then
      echo "AVD disponibles:" >&2
      "$emulator_bin" -list-avds >&2 || true
    fi
    exit 1
  fi

  [[ -x "$emulator_bin" ]] || {
    echo "Erreur: emulateur Android introuvable: $emulator_bin" >&2
    exit 1
  }
  if ! "$emulator_bin" -list-avds | grep -Fxq -- "$avd_name"; then
    echo "Erreur: AVD inconnu: $avd_name" >&2
    echo "AVD disponibles:" >&2
    "$emulator_bin" -list-avds >&2 || true
    exit 1
  fi

  emulator_log="$(mktemp -t my-happy-wallet-emulator.XXXXXX.log)"
  echo "Demarrage de l'AVD $avd_name (journal: $emulator_log)..."
  nohup "$emulator_bin" -avd "$avd_name" >"$emulator_log" 2>&1 &
  wait_for_device
fi

echo "Appareil detecte:"
"$adb_bin" devices -l

compose_up=(docker compose -f "$compose_file" up -d)
if $build_stack; then
  compose_up+=(--build)
fi
echo "Demarrage de la stack locale..."
"${compose_up[@]}"
docker compose -f "$compose_file" exec backend npm run db:deploy

if $install_app || ! "$adb_bin" shell pm path com.andriacapai.myhappywallet >/dev/null 2>&1; then
  [[ -x "$mobile_dir/android/gradlew" ]] || {
    echo "Erreur: wrapper Gradle introuvable dans $mobile_dir/android" >&2
    exit 1
  }
  echo "Installation du development build..."
  (
    cd "$mobile_dir/android"
    ./gradlew :app:installDebug -PreactNativeArchitectures=x86_64
  )
fi

"$adb_bin" reverse tcp:8081 tcp:8081
"$adb_bin" reverse tcp:4200 tcp:4200
echo "Ports ADB inverses:"
"$adb_bin" reverse --list

if [[ "$(curl --silent --fail --max-time 1 "$metro_status_url" 2>/dev/null || true)" == "packager-status:running" ]]; then
  echo "Erreur: un serveur Metro utilise deja le port 8081." >&2
  echo "Reutilise son terminal ou arrete uniquement son conteneur identifie." >&2
  exit 1
fi

echo "Demarrage de Metro dans Docker..."
export MHW_HOST_UID="$(id -u)"
export MHW_HOST_GID="$(id -g)"
export EXPO_PUBLIC_API_ORIGIN="http://127.0.0.1:4200"
metro_compose=(docker compose -f "$metro_compose_file")
"${metro_compose[@]}" up -d --force-recreate metro

stop_metro() {
  "${metro_compose[@]}" down --remove-orphans >/dev/null 2>&1 || true
}
trap stop_metro EXIT INT TERM

for _ in {1..90}; do
  metro_status="$(curl --silent --fail --max-time 1 "$metro_status_url" 2>/dev/null || true)"
  if [[ "$metro_status" == "packager-status:running" ]]; then
    break
  fi
  if ! "${metro_compose[@]}" ps --status running --services | grep -Fxq metro; then
    echo "Erreur: Metro s'est arrete avant de devenir disponible." >&2
    "${metro_compose[@]}" logs --no-color metro >&2
    exit 1
  fi
  sleep 1
done

if [[ "$(curl --silent --fail --max-time 1 "$metro_status_url" 2>/dev/null || true)" != "packager-status:running" ]]; then
  echo "Erreur: Metro n'est pas disponible apres 90 secondes." >&2
  "${metro_compose[@]}" logs --no-color metro >&2
  exit 1
fi

echo "Ouverture du development build..."
"$adb_bin" shell am start \
  -a android.intent.action.VIEW \
  -d 'myhappywallet://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081' \
  com.andriacapai.myhappywallet >/dev/null

echo
echo "My Happy Wallet est lance. Garde ce terminal ouvert pour Metro."
echo "API: http://localhost:4200/v1/ - Mailpit: http://localhost:8025"
echo "Utilise Ctrl+C pour arreter uniquement Metro."
"${metro_compose[@]}" logs --follow --no-color metro
