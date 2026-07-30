#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_ENV="$ROOT_DIR/.container/deploy.env"
DEPLOY_SAMPLE="$ROOT_DIR/.container/deploy.env.sample"
TOOL_ARGS=(--deployment)

usage() {
  cat <<'EOF'
Usage: bash prepare-env.sh [--check] [--non-interactive] [--set=KEY=VALUE]

Prepare the private cloud/container deployment environment from
.container/deploy.env.sample. This command never reads or copies root .env.

Without --check, missing sample values are added, missing infrastructure secrets
are generated when --non-interactive is used, and deployment values are
validated before .container/deploy.env is saved with private permissions.

--check validates the existing deployment file without creating or changing it.
--set=KEY=VALUE supplies a non-secret deployment value explicitly. Never pass
credentials through command-line arguments; use the hidden interactive prompts
or provision the private deployment file through the cloud secret manager.
EOF
}

for argument in "$@"; do
  case "$argument" in
    --check) TOOL_ARGS+=(--check) ;;
    --non-interactive) TOOL_ARGS+=(--non-interactive) ;;
    --set=*) TOOL_ARGS+=("$argument") ;;
    -h|--help) usage; exit 0 ;;
    *) usage >&2; exit 64 ;;
  esac
done

[ -f "$DEPLOY_SAMPLE" ] || {
  echo "Missing deployment example: $DEPLOY_SAMPLE" >&2
  exit 78
}

NODE_RUNTIME_VERSION="$(
  grep -m1 '"node"' "$ROOT_DIR/package.json" |
    cut -d'"' -f4 |
    sed 's/^[^0-9]*//'
)"
[ -n "$NODE_RUNTIME_VERSION" ] || {
  echo "Could not resolve the deployment Node version from package.json." >&2
  exit 78
}

if command -v node >/dev/null 2>&1; then
  (
    cd "$ROOT_DIR"
    node tools/configure-env.mjs "${TOOL_ARGS[@]}"
  )
else
  command -v docker >/dev/null 2>&1 || {
    echo "Docker is required when Node.js is not installed on the deployment host." >&2
    exit 69
  }
  docker info >/dev/null 2>&1 || {
    echo "Docker Engine is not reachable." >&2
    exit 69
  }

  docker_arguments=(--rm -i)
  if [ -t 0 ] && [ -t 1 ]; then
    docker_arguments+=(-t)
  fi
  if command -v id >/dev/null 2>&1; then
    docker_arguments+=(--user "$(id -u):$(id -g)")
  fi

  echo "Host Node.js is unavailable; using Docker Node $NODE_RUNTIME_VERSION."
  MSYS_NO_PATHCONV=1 docker run "${docker_arguments[@]}" \
    --volume "$ROOT_DIR:/workspace" \
    --workdir /workspace \
    "node:${NODE_RUNTIME_VERSION}-bookworm-slim" \
    node tools/configure-env.mjs "${TOOL_ARGS[@]}"
fi

if [ -f "$DEPLOY_ENV" ]; then
  chmod 600 "$DEPLOY_ENV" 2>/dev/null || true
fi
