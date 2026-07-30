#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTAINER_DIR="$ROOT_DIR/.container"
# shellcheck source=.container/scripts/common.sh
. "$CONTAINER_DIR/scripts/common.sh"

MODE=install
TARGET=billing
ASSUME_YES=false
CLEAN_BEFORE_INSTALL=false

usage() {
  cat <<'EOF'
Usage: bash setup.sh [--clean] [--reinstall] [--yes] [billing]

Interactive CODEXSUN container installation from the repository root.

The installer requires an already prepared .container/deploy.env, validates it,
verifies Docker resource ownership and the runtime toolchain, starts MariaDB,
Redis, and File Browser, then deploys Billing, Core, Mail, and Platform through
the Billing application stack.

--reinstall cleanly replaces CODEXSUN containers and images, then runs safe
forward migrations. Named volumes, databases, credentials, and uploads remain.
No setup mode deletes a Docker volume or drops a database.

--yes applies the displayed deployment plan without confirmation.

--clean opens the scoped local cleanup menu before installation. Choose
application only, all runtime containers/images, or complete local data cleanup.
Build-cache pruning is offered separately.

Configuration:
  .env                         Local development only
  .container/deploy.env        Private deployment configuration
  .container/deploy.env.sample Shareable deployment defaults

Prepare deployment configuration separately before setup:
  bash prepare-env.sh

Cloud preparation:
  bash prepare-env.sh
EOF
}

for argument in "$@"; do
  case "$argument" in
    --reinstall) MODE=reinstall ;;
    --clean) CLEAN_BEFORE_INSTALL=true ;;
    -y|--yes) ASSUME_YES=true ;;
    billing) TARGET=$argument ;;
    -h|--help) usage; exit 0 ;;
    *) usage >&2; exit 64 ;;
  esac
done

bash "$ROOT_DIR/prepare-env.sh" --check

if [ "$CLEAN_BEFORE_INSTALL" = true ]; then
  bash "$CONTAINER_DIR/clean.sh" --interactive
fi

prepare_deploy_env
validate_deploy_env
require_docker
validate_container_ownership

echo
echo "CODEXSUN deployment plan"
echo "  Runtime and deployment configuration: $DEPLOY_ENV"
echo "  Infrastructure: MariaDB, Redis, and File Browser"
echo "  Application: Framework + UI + Platform + Core + Billing + Mail"
echo "  Persistent data: named volumes are preserved"
echo "  Container ownership: verified before Docker changes"
if [ "$ASSUME_YES" != true ]; then
  read -r -p "Build and apply this CODEXSUN installation? [Y/n] " confirmation
  case "${confirmation:-Y}" in
    y|Y|yes|Yes|YES) ;;
    *)
      echo "Setup cancelled before Docker changes."
      exit 0
      ;;
  esac
fi
ensure_network

infrastructure_image() {
  stack="$1"
  registry=$(env_value CXAPP_IMAGE_REGISTRY)
  case "$stack" in
    mariadb) tag=$(env_value MARIADB_IMAGE_TAG) ;;
    redis) tag=$(env_value REDIS_IMAGE_TAG) ;;
    media) tag=$(env_value MEDIA_IMAGE_TAG) ;;
    *) echo "Unknown infrastructure image: $stack" >&2; exit 64 ;;
  esac
  printf '%s/%s:%s' "$registry" "$stack" "$tag"
}

remove_infrastructure_images() {
  for stack in mariadb redis media; do
    image=$(infrastructure_image "$stack")
    if docker image inspect "$image" >/dev/null 2>&1; then
      docker image rm "$image" >/dev/null || {
        echo "Failed to remove infrastructure image: $image" >&2
        exit 74
      }
      echo "Removed infrastructure image: $image"
    fi
  done
}

stop_all_containers() {
  bash "$CONTAINER_DIR/deploy.sh" billing down >/dev/null 2>&1 || true
  stack_compose media down --remove-orphans
  stack_compose database/redis down --remove-orphans
  stack_compose database/mariadb down --remove-orphans
}

build_option=()
if [ "$MODE" = reinstall ]; then
  echo "Clean reinstall requested. Named volumes and databases will be preserved."
  stop_all_containers
  remove_infrastructure_images
  build_option=(--pull --no-cache)
fi

stack_compose database/mariadb build "${build_option[@]}"
stack_compose database/mariadb up -d --no-build --wait --wait-timeout 180
MSYS_NO_PATHCONV=1 docker exec cxapp-mariadb \
  bash /docker-entrypoint-initdb.d/10-cxapp-grants.sh >/dev/null
echo "MariaDB application grants reconciled. Host access: $(env_value CXAPP_BIND_ADDRESS):$(env_value MARIADB_HOST_PORT)."

stack_compose database/redis build "${build_option[@]}"
stack_compose database/redis up -d --no-build --wait --wait-timeout 120

stack_compose media build "${build_option[@]}"
bash "$CONTAINER_DIR/setup-media.sh"
bash "$CONTAINER_DIR/update-runtime.sh"

deploy_target() {
  stack="$1"
  if [ "$MODE" = reinstall ]; then
    bash "$CONTAINER_DIR/deploy.sh" "$stack" --reinstall
  else
    bash "$CONTAINER_DIR/deploy.sh" "$stack" up
  fi
}

deploy_target "$TARGET"
bash "$CONTAINER_DIR/smoke-test.sh"

echo "CODEXSUN setup completed: mode=$MODE target=$TARGET"
