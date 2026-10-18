#!/usr/bin/env bash

set -uo pipefail

require_device=false
ok_count=0
warning_count=0
failure_count=0

usage() {
  cat <<'EOF'
Usage: diagnose-android-host.sh [--require-device]

Checks the Linux host, Android SDK, Java, Docker, AVDs and connected devices.
Warnings describe optional setup; failures make the command exit with status 1.

Options:
  --require-device  Fail unless an online device has the development build.
  -h, --help        Show this help.
EOF
}

while (($# > 0)); do
  case "$1" in
    --require-device)
      require_device=true
      shift
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

ok() {
  ok_count=$((ok_count + 1))
  printf '[OK] %s\n' "$1"
}

warn() {
  warning_count=$((warning_count + 1))
  printf '[WARN] %s\n' "$1"
}

fail() {
  failure_count=$((failure_count + 1))
  printf '[FAIL] %s\n' "$1"
}

check_command() {
  if command -v "$1" >/dev/null 2>&1; then
    ok "$2: $(command -v "$1")"
    return 0
  fi
  fail "$2 is not available in PATH"
  return 1
}

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
mobile_dir="$(cd -- "$script_dir/.." && pwd)"
config_home="${XDG_CONFIG_HOME:-${HOME}/.config}"
android_sdk_root="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-$config_home/android-sdk}}"
adb_bin="$android_sdk_root/platform-tools/adb"
emulator_bin="$android_sdk_root/emulator/emulator"

echo "Android host diagnostic"
echo "SDK: $android_sdk_root"
echo

if [[ "$(uname -s)" == "Linux" ]]; then
  ok "Linux host detected"
else
  fail "this diagnostic currently supports Linux hosts"
fi

if [[ -n "${ANDROID_HOME:-}" && -n "${ANDROID_SDK_ROOT:-}" && "$ANDROID_HOME" != "$ANDROID_SDK_ROOT" ]]; then
  warn "ANDROID_HOME and ANDROID_SDK_ROOT point to different directories"
elif [[ -d "$android_sdk_root" ]]; then
  ok "Android SDK directory exists"
else
  fail "Android SDK directory is missing; set ANDROID_SDK_ROOT"
fi

if [[ -x "$adb_bin" ]]; then
  adb_version="$($adb_bin version 2>&1 | head -n 1)"
  ok "ADB available: $adb_version"
else
  fail "ADB is missing at $adb_bin"
fi

if [[ -x "$emulator_bin" ]]; then
  ok "Android emulator available"
  avd_list="$($emulator_bin -list-avds 2>/dev/null || true)"
  if [[ -n "$avd_list" ]]; then
    ok "at least one AVD is configured: $(printf '%s\n' "$avd_list" | head -n 1)"
  else
    warn "no AVD is configured; a physical Android device can still be used"
  fi
else
  fail "Android emulator is missing at $emulator_bin"
fi

if [[ -e /dev/kvm ]]; then
  if [[ -r /dev/kvm && -w /dev/kvm ]]; then
    ok "KVM acceleration is accessible"
  else
    warn "/dev/kvm exists but the current user cannot read and write it"
  fi
else
  warn "/dev/kvm is unavailable; use a physical device or enable virtualization"
fi

if check_command java "Java"; then
  java_version="$(java -version 2>&1 | head -n 1)"
  java_major="$(printf '%s' "$java_version" | sed -E 's/.*version "([0-9]+).*/\1/')"
  if [[ "$java_major" =~ ^[0-9]+$ ]] && ((java_major >= 17)); then
    ok "Java version is compatible: $java_version"
  else
    fail "Java 17 or newer is required: $java_version"
  fi
fi

if check_command docker "Docker CLI"; then
  if docker compose version >/dev/null 2>&1; then
    ok "Docker Compose v2 is available"
  else
    fail "Docker Compose v2 is unavailable"
  fi
  if docker info >/dev/null 2>&1; then
    ok "Docker daemon is reachable by the current user"
  else
    fail "Docker daemon is not reachable by the current user"
  fi
fi

if [[ -x "$mobile_dir/android/gradlew" ]]; then
  ok "generated Android project and Gradle wrapper are present"
else
  warn "mobile/android is absent; run the documented Expo prebuild step"
fi

online_serial=""
if [[ -x "$adb_bin" ]]; then
  adb_devices="$($adb_bin devices -l 2>&1 || true)"
  online_serial="$(printf '%s\n' "$adb_devices" | awk 'NR > 1 && $2 == "device" { print $1; exit }')"
  if [[ -n "$online_serial" ]]; then
    ok "online Android device detected: $online_serial"
  elif $require_device; then
    fail "no online Android device is available"
  else
    warn "no online Android device is available"
  fi
fi

if $require_device && [[ -n "$online_serial" ]]; then
  if "$adb_bin" -s "$online_serial" shell pm path com.andriacapai.myhappywallet >/dev/null 2>&1; then
    ok "My Happy Wallet development build is installed"
  else
    fail "My Happy Wallet development build is not installed on $online_serial"
  fi
fi

echo
printf 'Summary: %d ok, %d warning(s), %d failure(s)\n' \
  "$ok_count" "$warning_count" "$failure_count"

((failure_count == 0))
