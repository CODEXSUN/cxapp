#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=.container/scripts/common.sh
. "$SCRIPT_DIR/scripts/common.sh"

ASSUME_YES=false
INSTALL_FRESH=false
PRUNE_ALL_BUILD_CACHE=false
ALL_DOCKER=false
TARGET=billing

usage() {
  cat <<'EOF'
Usage: .container/clean.sh [--yes] [--install] [--all-build-cache] [--all-docker] [billing]

Deletes only CODEXSUN Docker containers, images, networks, and named volumes.
The ignored .container/deploy.env file is preserved so credentials and explicit
deployment settings can be reused by a fresh installation.

Options:
  --yes              Skip the destructive confirmation prompt.
  --install          Run setup.sh after cleanup for a fresh installation.
  --all-build-cache  Also prune all unused Docker BuildKit cache. Docker does
                     not expose reliable project ownership for build cache, so
                     this may remove cache created by other local projects.
  --all-docker       Delete every local Docker container, custom network,
                     volume, image, and build cache before installation. This
                     is host-wide and is not limited to CODEXSUN.
EOF
}

for arg in "$@"; do
  case "$arg" in
    --yes) ASSUME_YES=true ;;
    --install) INSTALL_FRESH=true ;;
    --all-build-cache) PRUNE_ALL_BUILD_CACHE=true ;;
    --all-docker) ALL_DOCKER=true; PRUNE_ALL_BUILD_CACHE=true ;;
    billing) TARGET=$arg ;;
    -h|--help) usage; exit 0 ;;
    *) usage >&2; exit 64 ;;
  esac
done

prepare_deploy_env
validate_deploy_env
require_docker

assert_codexsun_name() {
  kind="$1"
  value="$2"
  case "$value" in
    codexsun|codexsun-*) ;;
    *)
      echo "Refusing to delete $kind outside the CODEXSUN namespace: $value" >&2
      exit 73
      ;;
  esac
}

network=$(env_value CODEXSUN_DOCKER_NETWORK codexsun-network)
assert_codexsun_name network "$network"

volumes=(
  "$(env_value MARIADB_DATA_VOLUME codexsun-mariadb-data)"
  "$(env_value MARIADB_BACKUP_VOLUME codexsun-mariadb-backups)"
  "$(env_value REDIS_DATA_VOLUME codexsun-redis-data)"
  "$(env_value MEDIA_DATA_VOLUME codexsun-media-data)"
  "$(env_value MEDIA_DB_VOLUME codexsun-media-db)"
  "$(env_value BILLING_STACK_DATA_VOLUME codexsun-billing-stack-data)"
)
for volume in "${volumes[@]}"; do
  assert_codexsun_name volume "$volume"
done

registry=$(env_value CODEXSUN_IMAGE_REGISTRY codexsun)
repositories=(
  "$registry/mariadb"
  "$registry/redis"
  "$registry/media"
  "$registry/billing-stack-api"
  "$registry/billing-stack-web"
  "$registry/billing-stack-migrations"
)

if [ "$ALL_DOCKER" = "true" ]; then
  echo "HOST-WIDE Docker cleanup will permanently remove every local:"
  echo "  Container:"
  docker ps -a --format '    {{.Names}} ({{.Image}})'
  echo "  Custom network:"
  docker network ls --format '{{.Name}}' | grep -Ev '^(bridge|host|none)$' | sed 's/^/    /' || true
  echo "  Volume:"
  docker volume ls --format '    {{.Name}}'
  echo "  Image:"
  docker image ls --all --format '    {{.Repository}}:{{.Tag}} ({{.ID}})'
else
  cat <<EOF
CODEXSUN Docker cleanup will permanently remove:
  Compose projects: codexsun-billing, codexsun-media, codexsun-redis, codexsun-mariadb
  Network: $network
  Volumes:
$(printf '    %s\n' "${volumes[@]}")
  Image repositories:
$(printf '    %s\n' "${repositories[@]}")
EOF
fi

if [ "$PRUNE_ALL_BUILD_CACHE" = "true" ]; then
  echo "  All unused Docker BuildKit cache, including cache from other projects."
fi

if [ "$ASSUME_YES" != "true" ]; then
  required_confirmation=CLEAN_CODEXSUN
  [ "$ALL_DOCKER" = "true" ] && required_confirmation=CLEAN_ALL_DOCKER
  printf 'Type %s to continue: ' "$required_confirmation"
  read -r confirmation
  [ "$confirmation" = "$required_confirmation" ] || {
    echo "Cleanup cancelled."
    exit 0
  }
fi

if [ "$ALL_DOCKER" = "true" ]; then
  container_ids=$(docker ps -aq)
  if [ -n "$container_ids" ]; then
    docker rm -f $container_ids >/dev/null
    echo "Removed all local Docker containers."
  fi

  volume_names=$(docker volume ls --quiet)
  if [ -n "$volume_names" ]; then
    docker volume rm $volume_names >/dev/null
    echo "Removed all local Docker volumes."
  fi

  network_names=$(docker network ls --format '{{.Name}}' | grep -Ev '^(bridge|host|none)$' || true)
  if [ -n "$network_names" ]; then
    docker network rm $network_names >/dev/null
    echo "Removed all custom Docker networks."
  fi

  image_ids=$(docker image ls --all --quiet | sort -u)
  if [ -n "$image_ids" ]; then
    docker image rm -f $image_ids >/dev/null
    echo "Removed all local Docker images."
  fi
else
  for project in codexsun-billing codexsun-media codexsun-redis codexsun-mariadb; do
    container_ids=$(docker ps -aq --filter "label=com.docker.compose.project=$project")
    if [ -n "$container_ids" ]; then
      docker rm -f $container_ids >/dev/null
      echo "Removed containers for Compose project: $project"
    fi
  done

  for container in codexsun-platform-web codexsun-platform-api codexsun-media codexsun-redis codexsun-mariadb; do
    if docker container inspect "$container" >/dev/null 2>&1; then
      docker rm -f "$container" >/dev/null
      echo "Removed container: $container"
    fi
  done

  for volume in "${volumes[@]}"; do
    if docker volume inspect "$volume" >/dev/null 2>&1; then
      docker volume rm "$volume" >/dev/null
      echo "Removed volume: $volume"
    fi
  done

  if docker network inspect "$network" >/dev/null 2>&1; then
    docker network rm "$network" >/dev/null
    echo "Removed network: $network"
  fi

  for repository in "${repositories[@]}"; do
    image_ids=$(docker image ls --all --quiet "$repository" | sort -u)
    if [ -n "$image_ids" ]; then
      docker image rm -f $image_ids >/dev/null
      echo "Removed images: $repository"
    fi
  done
fi

if [ "$PRUNE_ALL_BUILD_CACHE" = "true" ]; then
  docker builder prune --all --force
fi

echo "CODEXSUN Docker cleanup completed."

if [ "$INSTALL_FRESH" = "true" ]; then
  echo "Starting fresh CODEXSUN installation."
  bash "$SCRIPT_DIR/setup.sh" "$TARGET"
fi
