#!/usr/bin/env bash

set -Eeuo pipefail

for variable in CI_COMMIT_SHA DEPLOY_PATH SERVER_IP SERVER_USER; do
  if [[ -z "${!variable:-}" ]]; then
    echo "Missing required variable: ${variable}" >&2
    exit 1
  fi
done

if [[ ! "$CI_COMMIT_SHA" =~ ^[0-9a-f]{40}$ ]]; then
  echo "CI_COMMIT_SHA must be a full hexadecimal commit SHA." >&2
  exit 1
fi

if [[ ! "$DEPLOY_PATH" =~ ^/[A-Za-z0-9._/-]+$ ]]; then
  echo "DEPLOY_PATH contains unsupported characters." >&2
  exit 1
fi

if [[ ! "$SERVER_USER" =~ ^[a-z_][a-z0-9_-]*$ ]]; then
  echo "SERVER_USER contains unsupported characters." >&2
  exit 1
fi

if [[ ! "$SERVER_IP" =~ ^[A-Za-z0-9.:-]+$ ]]; then
  echo "SERVER_IP contains unsupported characters." >&2
  exit 1
fi

if [[ ! -s dist/index.html ]]; then
  echo "The validated dist artifact is missing index.html." >&2
  exit 1
fi

printf '%s\n' "$CI_COMMIT_SHA" >dist/deployment-sha.txt

ssh_target="${SERVER_USER}@${SERVER_IP}"
release_relative="releases/${CI_COMMIT_SHA}"
release_path="${DEPLOY_PATH}/${release_relative}"
healthcheck_url="${CI_ENVIRONMENT_URL:-https://myhappywallet.andriacapai.com}"

ssh "$ssh_target" bash -s -- "$DEPLOY_PATH" "$CI_COMMIT_SHA" <<'REMOTE'
set -Eeuo pipefail
deploy_path="$1"
commit_sha="$2"
install -d -m 2750 -- "$deploy_path/releases/$commit_sha"
REMOTE

rsync \
  --archive \
  --compress \
  --delete-delay \
  --delay-updates \
  --no-owner \
  --no-group \
  --chmod=Du=rwx,Dgo=rx,Dg+s,Fu=rw,Fgo=r \
  dist/ \
  "${ssh_target}:${release_path}/"

previous_release="$(
  ssh "$ssh_target" bash -s -- "$DEPLOY_PATH" <<'REMOTE'
set -Eeuo pipefail
readlink -- "$1/current" || true
REMOTE
)"

ssh "$ssh_target" bash -s -- "$DEPLOY_PATH" "$CI_COMMIT_SHA" <<'REMOTE'
set -Eeuo pipefail
deploy_path="$1"
commit_sha="$2"
release_path="$deploy_path/releases/$commit_sha"
next_link="$deploy_path/.current-$commit_sha"

test -s "$release_path/index.html"
rm -f -- "$next_link"
ln -s "releases/$commit_sha" "$next_link"
mv -Tf -- "$next_link" "$deploy_path/current"
REMOTE

deployed_sha=""
for attempt in {1..6}; do
  deployed_sha="$(
    curl \
      --fail \
      --location \
      --show-error \
      --silent \
      "${healthcheck_url%/}/deployment-sha.txt?sha=${CI_COMMIT_SHA}" || true
  )"

  if [[ "$deployed_sha" == "$CI_COMMIT_SHA" ]]; then
    break
  fi

  sleep 2
done

if [[ "$deployed_sha" != "$CI_COMMIT_SHA" ]]; then
  echo "Production healthcheck failed; restoring the previous release." >&2

  if [[ "$previous_release" =~ ^releases/[A-Za-z0-9._-]+$ ]]; then
    ssh "$ssh_target" bash -s -- "$DEPLOY_PATH" "$previous_release" <<'REMOTE'
set -Eeuo pipefail
deploy_path="$1"
previous_release="$2"
rollback_link="$deploy_path/.current-rollback"

rm -f -- "$rollback_link"
ln -s "$previous_release" "$rollback_link"
mv -Tf -- "$rollback_link" "$deploy_path/current"
REMOTE
  else
    echo "No safe previous release was available for rollback." >&2
  fi

  exit 1
fi

ssh "$ssh_target" bash -s -- "$DEPLOY_PATH" <<'REMOTE'
set -Eeuo pipefail
deploy_path="$1"
current_release="$(readlink -- "$deploy_path/current")"
retained=0

mapfile -t releases < <(
  find "$deploy_path/releases" -mindepth 1 -maxdepth 1 -type d \
    -printf '%T@ %f\n' | sort -nr | cut -d' ' -f2-
)

for release in "${releases[@]}"; do
  if [[ ! "$release" =~ ^([0-9a-f]{40}|legacy)$ ]]; then
    continue
  fi

  if [[ "releases/$release" == "$current_release" ]]; then
    continue
  fi

  if ((retained < 5)); then
    retained=$((retained + 1))
    continue
  fi

  rm -rf -- "$deploy_path/releases/$release"
done
REMOTE

echo "Frontend release ${CI_COMMIT_SHA} deployed successfully."
