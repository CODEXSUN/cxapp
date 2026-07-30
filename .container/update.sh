#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=.container/scripts/common.sh
. "$SCRIPT_DIR/scripts/common.sh"

ASSUME_YES=false
CHECK_ONLY=false
BACKUP_DIR="$SCRIPT_DIR/backups"

usage() {
  cat <<'EOF'
Usage: bash update.sh [--check] [--yes]

Safely update an existing CODEXSUN Docker installation while preserving:

  - .container/deploy.env and every configured deployment credential
  - MariaDB databases, Redis state, File Browser data, and named volumes
  - existing container names, host ports, and the Docker network

Before application replacement, the updater validates configuration and
Compose ownership, builds the current API, Web, and migration images, creates
a timestamped MariaDB backup, and applies safe forward migrations. It recreates
only cxapp-api and cxapp-web, waits for health, runs the deployment smoke test,
and restores the previous application images if replacement fails.

The updater never runs interactive setup, changes either environment file, recreates
infrastructure, removes volumes, pulls source, or touches unrelated containers.

Options:
      --check Validate the existing deployment without rebuilding containers.
  -y, --yes  Apply the update without an interactive confirmation.
  -h, --help Show this help.

Run this script after updating the repository source.
EOF
}

while (($# > 0)); do
  case "$1" in
    -y|--yes)
      ASSUME_YES=true
      ;;
    --check)
      CHECK_ONLY=true
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 64
      ;;
  esac
  shift
done

container_is_running() {
  [ "$(docker inspect --format '{{.State.Running}}' "$1" 2>/dev/null || true)" = true ]
}

require_existing_service() {
  container="$1"
  project="$2"
  service="$3"
  docker container inspect "$container" >/dev/null 2>&1 || {
    echo "Existing CODEXSUN $service container was not found: $container" >&2
    echo "Run bash setup.sh to create a new installation." >&2
    exit 69
  }
  container_is_compose_service "$container" "$project" "$service" || {
    echo "Refusing to use container not owned by Compose project $project: $container" >&2
    exit 78
  }
}

stack_image() {
  role="$1"
  registry=$(env_value CXAPP_IMAGE_REGISTRY)
  case "$role" in
    api) tag=$(env_value BILLING_STACK_API_IMAGE_TAG) ;;
    web) tag=$(env_value BILLING_STACK_WEB_IMAGE_TAG) ;;
    *) echo "Unknown application image role: $role" >&2; exit 64 ;;
  esac
  printf '%s/billing-stack-%s:%s' "$registry" "$role" "$tag"
}

rollback_application() {
  reason="$1"
  rollback_status=0
  echo "$reason" >&2
  echo "Restoring the previous API and Web images." >&2
  set +e
  docker image tag "$old_api_image" "$(stack_image api)" || rollback_status=$?
  docker image tag "$old_web_image" "$(stack_image web)" || rollback_status=$?
  stack_compose billing up -d \
    --no-build \
    --no-deps \
    --force-recreate \
    --wait \
    --wait-timeout 300 \
    platform-api platform-web || rollback_status=$?
  set -e
  if ((rollback_status == 0)); then
    echo "Previous application containers restored. Database backup: $backup_file" >&2
  else
    echo "Automatic application rollback failed. Database backup: $backup_file" >&2
  fi
  exit 70
}

prepare_deploy_env
validate_deploy_env
require_docker
validate_container_ownership

require_existing_service cxapp-mariadb cxapp-mariadb mariadb
require_existing_service cxapp-redis cxapp-redis redis
require_existing_service cxapp-media cxapp-media media
require_existing_service cxapp-api cxapp-billing platform-api
require_existing_service cxapp-web cxapp-billing platform-web

for container in cxapp-mariadb cxapp-redis cxapp-media cxapp-api cxapp-web; do
  container_is_running "$container" || {
    echo "Existing CODEXSUN container is not running: $container" >&2
    exit 69
  }
done

stack_compose database/mariadb config --quiet
stack_compose database/redis config --quiet
stack_compose media config --quiet
stack_compose billing --profile tools config --quiet

echo
echo "CODEXSUN Docker update plan"
echo "  Runtime and deployment configuration: $DEPLOY_ENV (preserved)"
echo "  Infrastructure: MariaDB, Redis, and File Browser (preserved)"
echo "  Application containers: cxapp-api and cxapp-web"
echo "  Preflight: environment, Docker health, and Compose ownership"
echo "  Build: current API, Web, and migration images"
echo "  Backup: timestamped full MariaDB dump in $BACKUP_DIR"
echo "  Database: safe forward migrations before application replacement"
echo "  Verification: container health and complete deployment smoke test"
echo "  Source code: current repository checkout"

if [ "$CHECK_ONLY" = true ]; then
  echo
  echo "Existing CODEXSUN Docker deployment is ready to update."
  exit 0
fi

if [ "$ASSUME_YES" != true ]; then
  read -r -p "Build and update the existing CODEXSUN application containers? [Y/n] " confirmation
  case "${confirmation:-Y}" in
    y|Y|yes|Yes|YES) ;;
    *)
      echo "Update cancelled before Docker changes."
      exit 0
      ;;
  esac
fi

old_api_image=$(docker inspect --format '{{.Image}}' cxapp-api)
old_web_image=$(docker inspect --format '{{.Image}}' cxapp-web)

echo "Building the API, Web, and migration images."
bash "$SCRIPT_DIR/deploy.sh" billing build

mkdir -p "$BACKUP_DIR"
resolved_backup_dir="$(cd "$BACKUP_DIR" && pwd -P)"
[ "$resolved_backup_dir" != "/" ] && [ "$resolved_backup_dir" != "$PROJECT_ROOT" ] || {
  echo "Refusing to use unsafe backup directory: $resolved_backup_dir" >&2
  exit 78
}
chmod 700 "$resolved_backup_dir" 2>/dev/null || true
timestamp=$(date -u +%Y%m%dT%H%M%SZ)
backup_file="$resolved_backup_dir/cxapp-all-databases-$timestamp.sql"
backup_temp="${backup_file}.partial"

echo "Creating MariaDB backup: $backup_file"
if ! MSYS_NO_PATHCONV=1 docker exec \
  -e MYSQL_PWD="$(env_value DB_PASSWORD)" \
  cxapp-mariadb \
  mariadb-dump \
  --user="$(env_value DB_USER)" \
  --all-databases \
  --single-transaction \
  --quick \
  --routines \
  --triggers \
  --events >"$backup_temp"; then
  rm -f -- "$backup_temp"
  echo "MariaDB backup failed; the running application was not replaced." >&2
  exit 74
fi

if [ ! -s "$backup_temp" ] ||
  ! grep -Eq '^(-- (MariaDB|MySQL) dump|CREATE TABLE|-- Dump completed)' "$backup_temp"; then
  rm -f -- "$backup_temp"
  echo "MariaDB backup validation failed; the running application was not replaced." >&2
  exit 74
fi
mv -- "$backup_temp" "$backup_file"
chmod 600 "$backup_file" 2>/dev/null || true

echo "Applying safe forward migrations with the new migration image."
if ! bash "$SCRIPT_DIR/deploy.sh" billing migrate; then
  echo "Migration failed; existing application containers remain in place." >&2
  echo "Validated database backup: $backup_file" >&2
  exit 70
fi

if ! stack_compose billing up -d \
  --no-build \
  --no-deps \
  --force-recreate \
  --wait \
  --wait-timeout 300 \
  platform-api platform-web; then
  rollback_application "The replacement containers did not become healthy."
fi

if ! bash "$SCRIPT_DIR/smoke-test.sh"; then
  rollback_application "The replacement deployment failed its smoke test."
fi

echo
echo "CODEXSUN Docker update completed."
echo "Web: http://$(env_value CXAPP_BIND_ADDRESS):$(env_value PLATFORM_WEB_PORT)/"
echo "API health: http://$(env_value CXAPP_BIND_ADDRESS):$(env_value PLATFORM_API_PORT)/health"
echo "Validated database backup: $backup_file"
echo "Existing credentials, infrastructure, databases, uploads, and named volumes were preserved."
