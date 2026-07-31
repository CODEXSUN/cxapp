#!/usr/bin/env bash
set -euo pipefail
umask 077

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=.container/scripts/common.sh
. "$SCRIPT_DIR/scripts/common.sh"

ASSUME_YES=false
CHECK_ONLY=false
ALLOW_DIRTY=false
BACKUP_DIR="$SCRIPT_DIR/backups"
LOCK_FILE="${TMPDIR:-/tmp}/cxapp-update.lock"
backup_file="not-created"
backup_temp=""
backup_checksum="not-created"
metadata_file="not-created"
migration_result="not-started"
source_commit="unknown"
source_dirty="unknown"
source_version="unknown"

cleanup_partial_files() {
  [ -z "$backup_temp" ] || rm -f -- "$backup_temp" || true
  [ "$metadata_file" = "not-created" ] || rm -f -- "${metadata_file}.partial" || true
}
trap cleanup_partial_files EXIT

usage() {
  cat <<'EOF'
Usage: bash update.sh [--check] [--yes] [--allow-dirty]

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
      --allow-dirty Build uncommitted source after recording a prominent warning.
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
    --allow-dirty)
      ALLOW_DIRTY=true
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

if [ "$CHECK_ONLY" != true ]; then
  command -v flock >/dev/null 2>&1 || {
    echo "flock is required to serialize CXApp deployment updates." >&2
    exit 69
  }
  exec 9>"$LOCK_FILE"
  flock -n 9 || {
    echo "Another CXApp update is already running (lock: $LOCK_FILE)." >&2
    exit 75
  }
fi

positive_integer() {
  case "$1" in
    ''|*[!0-9]*|0) return 1 ;;
    *) return 0 ;;
  esac
}

read_source_version() {
  sed -n 's/^[[:space:]]*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' \
    "$PROJECT_ROOT/package.json" | head -n 1
}

validate_release_contract() {
  source_version=$(read_source_version)
  [ -n "$source_version" ] || {
    echo "Could not read the source version from $PROJECT_ROOT/package.json." >&2
    exit 78
  }

  for key in CXAPP_VERSION BILLING_STACK_API_IMAGE_TAG BILLING_STACK_WEB_IMAGE_TAG \
    BILLING_STACK_MIGRATIONS_IMAGE_TAG; do
    configured=$(env_value "$key")
    [ "$configured" = "$source_version" ] || {
      echo "Release version mismatch: package.json is $source_version but $key is ${configured:-unset}." >&2
      echo "Update $DEPLOY_ENV before building; mixed source and image versions are refused." >&2
      exit 78
    }
  done

  compatible_version=$(env_value CXAPP_MIGRATION_COMPATIBLE_VERSION)
  [ "$compatible_version" = "$source_version" ] || {
    echo "Migration compatibility is not approved for CXApp $source_version." >&2
    echo "After confirming expand-contract/backward compatibility with the current image, set:" >&2
    echo "  CXAPP_MIGRATION_COMPATIBLE_VERSION=$source_version" >&2
    echo "in $DEPLOY_ENV." >&2
    exit 78
  }
}

inspect_source_state() {
  command -v git >/dev/null 2>&1 || {
    echo "git is required to record reproducible deployment metadata." >&2
    exit 69
  }
  git -C "$PROJECT_ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1 || {
    echo "CXApp update source is not a Git worktree: $PROJECT_ROOT" >&2
    exit 78
  }
  source_commit=$(git -C "$PROJECT_ROOT" rev-parse HEAD)
  if [ -n "$(git -C "$PROJECT_ROOT" status --porcelain --untracked-files=normal)" ]; then
    source_dirty=true
    echo "WARNING: the CXApp Git worktree contains uncommitted or untracked files." >&2
    echo "Commit: $source_commit" >&2
    if [ "$ALLOW_DIRTY" != true ]; then
      echo "Commit/stash the changes, or rerun with --allow-dirty to deploy and record them." >&2
      exit 78
    fi
    echo "Continuing because --allow-dirty was explicitly supplied; this build is not reproducible from the commit alone." >&2
  else
    source_dirty=false
  fi
}

available_megabytes() {
  path="$1"
  df -Pk "$path" | awk 'NR == 2 { print int($4 / 1024) }'
}

require_free_space() {
  path="$1"
  required_mb="$2"
  label="$3"
  available_mb=$(available_megabytes "$path")
  positive_integer "$available_mb" || {
    echo "Could not determine free space for $label at $path." >&2
    exit 74
  }
  [ "$available_mb" -ge "$required_mb" ] || {
    echo "Insufficient free space for $label: ${available_mb} MB available, ${required_mb} MB required at $path." >&2
    exit 74
  }
  echo "  Disk space for $label: ${available_mb} MB available (${required_mb} MB minimum)"
}

write_deployment_metadata() {
  status="$1"
  api_digest="$2"
  web_digest="$3"
  [ "$metadata_file" != "not-created" ] || return 0
  cat >"${metadata_file}.partial" <<EOF
{
  "timestamp": "$timestamp",
  "status": "$status",
  "sourceCommit": "$source_commit",
  "sourceDirty": $source_dirty,
  "applicationVersion": "$source_version",
  "migrationCompatibilityVersion": "$(env_value CXAPP_MIGRATION_COMPATIBLE_VERSION)",
  "apiImageDigest": "$api_digest",
  "webImageDigest": "$web_digest",
  "previousApiImageDigest": "$old_api_image",
  "previousWebImageDigest": "$old_web_image",
  "migrationResult": "$migration_result",
  "backupPath": "$backup_file",
  "backupSha256": "$backup_checksum"
}
EOF
  mv -- "${metadata_file}.partial" "$metadata_file"
  chmod 600 "$metadata_file" 2>/dev/null || true
}

prune_old_backups() {
  retention="$1"
  count=0
  while IFS= read -r old_backup; do
    count=$((count + 1))
    if [ "$count" -gt "$retention" ]; then
      backup_name=${old_backup##*/}
      backup_timestamp=${backup_name#cxapp-all-databases-}
      backup_timestamp=${backup_timestamp%.sql}
      rm -f -- "$old_backup" "${old_backup}.sha256"
      rm -f -- "$resolved_backup_dir/cxapp-deployment-$backup_timestamp.json"
      echo "Removed expired backup: $old_backup"
    fi
  done < <(find "$resolved_backup_dir" -maxdepth 1 -type f \
    -name 'cxapp-all-databases-*.sql' -printf '%T@ %p\n' | sort -nr | cut -d' ' -f2-)
}

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
    write_deployment_metadata "rolled-back" "$built_api_image" "$built_web_image"
    echo "Previous application containers restored. Database backup: $backup_file" >&2
  else
    write_deployment_metadata "rollback-failed" "$built_api_image" "$built_web_image"
    echo "Automatic application rollback failed. Database backup: $backup_file" >&2
  fi
  exit 70
}

prepare_deploy_env
validate_deploy_env
validate_release_contract
inspect_source_state
require_docker
validate_container_ownership

backup_retention=$(env_value CXAPP_UPDATE_BACKUP_RETENTION)
backup_retention=${backup_retention:-10}
minimum_backup_mb=$(env_value CXAPP_UPDATE_MIN_BACKUP_FREE_MB)
minimum_backup_mb=${minimum_backup_mb:-1024}
minimum_docker_mb=$(env_value CXAPP_UPDATE_MIN_DOCKER_FREE_MB)
minimum_docker_mb=${minimum_docker_mb:-5120}
for setting in \
  "CXAPP_UPDATE_BACKUP_RETENTION:$backup_retention" \
  "CXAPP_UPDATE_MIN_BACKUP_FREE_MB:$minimum_backup_mb" \
  "CXAPP_UPDATE_MIN_DOCKER_FREE_MB:$minimum_docker_mb"; do
  key=${setting%%:*}
  value=${setting#*:}
  positive_integer "$value" || {
    echo "$key must be a positive integer; received: $value" >&2
    exit 78
  }
done

command -v sha256sum >/dev/null 2>&1 || {
  echo "sha256sum is required to verify deployment backups." >&2
  exit 69
}

mkdir -p "$BACKUP_DIR"
resolved_backup_dir="$(cd "$BACKUP_DIR" && pwd -P)"
[ "$resolved_backup_dir" != "/" ] && [ "$resolved_backup_dir" != "$PROJECT_ROOT" ] || {
  echo "Refusing to use unsafe backup directory: $resolved_backup_dir" >&2
  exit 78
}
docker_root=$(docker info --format '{{.DockerRootDir}}')
[ -n "$docker_root" ] && [ -d "$docker_root" ] || {
  echo "Docker did not report a readable storage root: ${docker_root:-unset}" >&2
  exit 69
}
require_free_space "$resolved_backup_dir" "$minimum_backup_mb" "MariaDB backup"
require_free_space "$docker_root" "$minimum_docker_mb" "Docker build storage"

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
echo "  Release: source and image tags locked to $source_version"
echo "  Source commit: $source_commit (dirty: $source_dirty)"
echo "  Build: current API, Web, and migration images"
echo "  Backup: SHA-256 verified full MariaDB dump; retain newest $backup_retention"
echo "  Database: version-approved backward-compatible forward migrations"
echo "  Audit: deployment metadata beside the retained backup"
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
built_api_image=$(docker image inspect --format '{{.Id}}' "$(stack_image api)")
built_web_image=$(docker image inspect --format '{{.Id}}' "$(stack_image web)")

chmod 700 "$resolved_backup_dir" 2>/dev/null || true
timestamp=$(date -u +%Y%m%dT%H%M%SZ)
backup_file="$resolved_backup_dir/cxapp-all-databases-$timestamp.sql"
backup_temp="${backup_file}.partial"
metadata_file="$resolved_backup_dir/cxapp-deployment-$timestamp.json"

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
backup_checksum=$(sha256sum "$backup_file" | awk '{print $1}')
printf '%s  %s\n' "$backup_checksum" "$(basename "$backup_file")" >"${backup_file}.sha256"
chmod 600 "${backup_file}.sha256" 2>/dev/null || true
(cd "$resolved_backup_dir" && sha256sum --check "$(basename "${backup_file}.sha256")") >/dev/null || {
  echo "MariaDB backup SHA-256 verification failed; the running application was not replaced." >&2
  exit 74
}
write_deployment_metadata "backup-verified" "$built_api_image" "$built_web_image"
prune_old_backups "$backup_retention"

echo "Checking production migration targets before applying the release."
if ! stack_compose billing --profile tools run --rm \
  -e "CXAPP_VERIFIED_BACKUP_ID=$timestamp" \
  platform-migrate npm run db:migrations:preflight; then
  migration_result="preflight-failed"
  write_deployment_metadata "migration-preflight-failed" "$built_api_image" "$built_web_image"
  echo "Migration preflight failed; existing application containers remain in place." >&2
  echo "Validated database backup: $backup_file" >&2
  exit 70
fi

echo "Applying safe forward migrations with the new migration image."
if ! bash "$SCRIPT_DIR/deploy.sh" billing migrate; then
  migration_result="failed"
  write_deployment_metadata "migration-failed" "$built_api_image" "$built_web_image"
  echo "Migration failed; existing application containers remain in place." >&2
  echo "Validated database backup: $backup_file" >&2
  exit 70
fi
migration_result="completed"
write_deployment_metadata "migrated" "$built_api_image" "$built_web_image"

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

new_api_image=$(docker inspect --format '{{.Image}}' cxapp-api)
new_web_image=$(docker inspect --format '{{.Image}}' cxapp-web)
write_deployment_metadata "completed" "$new_api_image" "$new_web_image"

echo
echo "CODEXSUN Docker update completed."
echo "Web: http://$(env_value CXAPP_BIND_ADDRESS):$(env_value PLATFORM_WEB_PORT)/"
echo "API health: http://$(env_value CXAPP_BIND_ADDRESS):$(env_value PLATFORM_API_PORT)/health"
echo "Validated database backup: $backup_file"
echo "Backup SHA-256: $backup_checksum"
echo "Deployment metadata: $metadata_file"
echo "Existing credentials, infrastructure, databases, uploads, and named volumes were preserved."
