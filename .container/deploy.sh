#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=.container/scripts/common.sh
. "$SCRIPT_DIR/scripts/common.sh"

STACK=${1:-}
ACTION=${2:-up}

usage() {
  cat <<'EOF'
Usage: .container/deploy.sh billing ACTION

Actions:
  up           Build locally, migrate when applicable, and start the stack.
  --reinstall  Replace only the selected stack's containers/images, rebuild
               without cache, migrate, and start. Named volumes are preserved.
  build        Build the selected stack images locally.
  publish      Build and push versioned images to CODEXSUN_IMAGE_REGISTRY.
  upgrade      Pull versioned images, migrate, and recreate only app containers.
  migrate      Run safe forward migrations and print migration state.
  ps           Show the selected stack containers.
  logs         Follow the selected stack logs.
  down         Remove only the selected stack containers. Volumes are preserved.

MariaDB, Redis, Media, deployment credentials, databases, and uploads are never
removed or recreated by this command.
EOF
}

case "$STACK" in
  billing) ;;
  -h|--help) usage; exit 0 ;;
  *) usage >&2; exit 64 ;;
esac

case "$ACTION" in
  up|--reinstall|build|publish|upgrade|migrate|ps|logs|down) ;;
  -h|--help) usage; exit 0 ;;
  *) usage >&2; exit 64 ;;
esac

prepare_deploy_env
validate_deploy_env
require_docker

compose_stack() {
  stack_compose "$STACK" "$@"
}

compose_all() {
  stack_compose "$STACK" --profile tools "$@"
}

require_stack_dependencies() {
  network=$(env_value CODEXSUN_DOCKER_NETWORK codexsun-network)
  docker network inspect "$network" >/dev/null 2>&1 || {
    echo "Required Docker network is missing: $network" >&2
    echo "Run: bash .container/setup.sh $STACK" >&2
    exit 69
  }

  media_data=$(env_value MEDIA_DATA_VOLUME codexsun-media-data)
  docker volume inspect "$media_data" >/dev/null 2>&1 || {
    echo "Required Media volume is missing: $media_data" >&2
    echo "Run: bash .container/setup.sh $STACK" >&2
    exit 69
  }

  for container in codexsun-mariadb codexsun-redis; do
    state=$(docker inspect "$container" --format '{{.State.Status}}' 2>/dev/null || true)
    health=$(docker inspect "$container" \
      --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' \
      2>/dev/null || true)
    [ "$state" = "running" ] && [ "$health" = "healthy" ] || {
      echo "Required dependency is not healthy: $container (state=${state:-missing}, health=${health:-missing})" >&2
      echo "deploy.sh will not modify infrastructure. Run: bash .container/setup.sh $STACK" >&2
      exit 69
    }
  done
}

stack_image() {
  suffix="$1"
  registry=${CODEXSUN_IMAGE_REGISTRY:-$(env_value CODEXSUN_IMAGE_REGISTRY codexsun)}
  upper_stack=$(printf '%s' "$STACK" | tr '[:lower:]' '[:upper:]')
  case "$suffix" in
    api) tag_key="${upper_stack}_STACK_API_IMAGE_TAG" ;;
    web) tag_key="${upper_stack}_STACK_WEB_IMAGE_TAG" ;;
    migrations) tag_key="${upper_stack}_STACK_MIGRATIONS_IMAGE_TAG" ;;
    *) echo "Unknown image role: $suffix" >&2; exit 64 ;;
  esac
  tag=$(env_value "$tag_key" "$(env_value CODEXSUN_VERSION 1.0.42)")
  printf '%s/%s-stack-%s:%s' "$registry" "$STACK" "$suffix" "$tag"
}

remove_stack_images() {
  roles="api web migrations"
  for role in $roles; do
    image=$(stack_image "$role")
    if docker image inspect "$image" >/dev/null 2>&1; then
      docker image rm "$image" >/dev/null || {
        echo "Failed to remove image: $image" >&2
        exit 74
      }
      echo "Removed image: $image"
    fi
  done
}

build_stack() {
  compose_all config --quiet
  compose_all build "$@"
}

publish_stack() {
  build_stack --pull
  compose_all push
}

migration_service() {
  case "$STACK" in
    billing) printf '%s' platform-migrate ;;
    *) return 1 ;;
  esac
}

migrate_stack() {
  require_stack_dependencies
  service=$(migration_service)
  echo "Applying forward migrations for $STACK. Database deletion is disabled."
  compose_all run --rm "$service"
  echo "Applied migration state:"
  compose_all run --rm "$service" npm run db:migrations:list
}

start_stack() {
  require_stack_dependencies
  compose_stack up -d --no-build --remove-orphans --wait --wait-timeout 300
}

up_stack() {
  build_stack
  migrate_stack
  start_stack
}

reinstall_stack() {
  require_stack_dependencies
  echo "Replacing $STACK containers and images. Named volumes and deployment input are preserved."
  compose_stack down --remove-orphans
  remove_stack_images
  build_stack --pull --no-cache
  migrate_stack
  start_stack
}

upgrade_stack() {
  require_stack_dependencies
  registry=${CODEXSUN_IMAGE_REGISTRY:-$(env_value CODEXSUN_IMAGE_REGISTRY codexsun)}
  echo "Pulling the versioned $STACK release from $registry."
  compose_all pull
  migrate_stack
  start_stack
}

case "$ACTION" in
  up) up_stack ;;
  --reinstall) reinstall_stack ;;
  build) build_stack ;;
  publish) publish_stack ;;
  upgrade) upgrade_stack ;;
  migrate) migrate_stack ;;
  ps) compose_stack ps ;;
  logs) compose_stack logs -f --tail=150 ;;
  down) compose_stack down --remove-orphans ;;
esac

echo "$STACK action completed: $ACTION"
