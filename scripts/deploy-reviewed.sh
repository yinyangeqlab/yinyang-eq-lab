#!/usr/bin/env bash
set -euo pipefail

if (( $# != 2 )); then
  printf 'Usage: bash scripts/deploy-reviewed.sh OWNER_WORKSPACE REVIEWED_PLAN\n       bash scripts/deploy-reviewed.sh --check OWNER_WORKSPACE\n' >&2
  exit 2
fi

check_only=false
if [[ "$1" == --check ]]; then
  check_only=true
  workspace="$(realpath -- "$2")"
else
  workspace="$(realpath -- "$1")"
  plan="$(realpath -- "$2")"
  test -s "$plan"
fi
scripts="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

# The owner recovery runner uses this same lock. Keep it through the apply.
exec 9< "$workspace/../private/backup-v2/run.lock"
if ! flock -n -x 9; then
  printf 'Production rollout blocked: another deployment or recovery operation holds the lock.\n' >&2
  exit 1
fi
export DEPLOY_OWNER_WORKSPACE="$workspace"
account="$(pulumi config get cloudflareAccountId --stack staging --non-interactive)"
script="$(pulumi config --stack staging --non-interactive --json | node -e '
  const config = JSON.parse(require("node:fs").readFileSync(0, "utf8"));
  const keys = Object.keys(config).filter(key => key.endsWith(":scriptName"));
  if (keys.length > 1) throw Error("Ambiguous Worker name in the existing stack");
  console.log(keys.length ? config[keys[0]].value : "yinyangeq-staging");
')"
node "$scripts/production-release-preflight.mjs" "$workspace" "$account" "$script"
if "$check_only"; then exit 0; fi
PULUMI_EXPERIMENTAL=true pulumi up --stack staging --non-interactive --yes --skip-preview --plan "$plan" --json
