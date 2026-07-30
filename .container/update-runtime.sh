#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=.container/scripts/common.sh
. "$SCRIPT_DIR/scripts/common.sh"

prepare_deploy_env
validate_deploy_env
require_docker

node_version=$(env_value NODE_RUNTIME_VERSION "")
npm_version=$(env_value NPM_RUNTIME_VERSION "")
[ -n "$node_version" ] && [ -n "$npm_version" ] || {
  echo "NODE_RUNTIME_VERSION and NPM_RUNTIME_VERSION are required." >&2
  exit 78
}

node_image="node:${node_version}-bookworm-slim"
echo "Refreshing container toolchain: Node $node_version, npm $npm_version"
docker pull "$node_image" >/dev/null

actual_node=$(docker run --rm "$node_image" node --version)
actual_npm=$(docker run --rm "$node_image" sh -ec \
  "npm install --global npm@${npm_version} >/dev/null 2>&1 && npm --version")

[ "$actual_node" = "v$node_version" ] || {
  echo "Node runtime mismatch: expected v$node_version, received $actual_node" >&2
  exit 69
}
[ "$actual_npm" = "$npm_version" ] || {
  echo "npm runtime mismatch: expected $npm_version, received $actual_npm" >&2
  exit 69
}

echo "Container toolchain ready: Node $actual_node, npm $actual_npm"
