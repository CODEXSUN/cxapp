#!/usr/bin/env sh
set -eu
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
. "$SCRIPT_DIR/scripts/common.sh"
prepare_deploy_env
validate_deploy_env
echo "Deployment input ready: $DEPLOY_ENV"
echo "Review public origins, image registry, and optional GSP values before deployment."
