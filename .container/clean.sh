#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=.container/scripts/common.sh
. "$SCRIPT_DIR/scripts/common.sh"

ASSUME_YES=false
INSTALL_FRESH=false
PRUNE_BUILD_CACHE=false
INTERACTIVE=false
SCOPE=data
TARGET=billing

usage() {
  cat <<'EOF'
Usage: .container/clean.sh [OPTIONS] [billing]

Clean CODEXSUN Docker resources with an explicit scope.

Scopes:
  --scope app      Remove only cxapp-api/cxapp-web and application images.
                   Databases, Redis, File Browser, volumes, and network remain.
  --scope runtime  Remove every CODEXSUN container and image. All named
                   volumes, databases, Redis data, files, and network remain.
  --scope data     Remove every CODEXSUN container, image, named volume, and
                   network. This permanently deletes local application data.
  --all-docker     Remove every Docker resource on the host. This is not
                   limited to CODEXSUN and requires separate confirmation.

Options:
  -i, --interactive  Ask for app/runtime/data scope and optional cache pruning.
  --prune            Also prune all unused Docker BuildKit cache. Docker does
                     not expose reliable project ownership for build cache.
  --all-build-cache  Alias for --prune.
  --install          Run root setup.sh after cleanup.
  -y, --yes          Skip the scope-specific confirmation.
  -h, --help         Show this help.

Without --interactive or --scope, the historical full CODEXSUN data-clean
scope is used. Root .env and .container/deploy.env are always preserved.
EOF
}

while (($# > 0)); do
  case "$1" in
    --scope)
      shift
      (($# > 0)) || {
        echo "--scope requires app, runtime, or data." >&2
        exit 64
      }
      SCOPE="$1"
      ;;
    --app) SCOPE=app ;;
    --runtime) SCOPE=runtime ;;
    --data) SCOPE=data ;;
    -i|--interactive) INTERACTIVE=true ;;
    --prune|--all-build-cache) PRUNE_BUILD_CACHE=true ;;
    --all-docker) SCOPE=host; PRUNE_BUILD_CACHE=true ;;
    --install) INSTALL_FRESH=true ;;
    -y|--yes) ASSUME_YES=true ;;
    billing) TARGET=billing ;;
    -h|--help) usage; exit 0 ;;
    *) usage >&2; exit 64 ;;
  esac
  shift
done

case "$SCOPE" in
  app|runtime|data|host) ;;
  *)
    echo "Unsupported cleanup scope: $SCOPE" >&2
    usage >&2
    exit 64
    ;;
esac

prepare_deploy_env
validate_deploy_env
require_docker

if [ "$INTERACTIVE" = true ]; then
  echo
  echo "Local CODEXSUN cleanup"
  echo "  1) app      Application containers and images only; preserve all data"
  echo "  2) runtime  All CODEXSUN containers and images; preserve all data"
  echo "  3) data     All CODEXSUN resources, databases, Redis, files, and volumes"
  echo "  4) cancel"
  read -r -p "Choose cleanup scope [1-4]: " choice
  case "$choice" in
    1|app) SCOPE=app ;;
    2|runtime) SCOPE=runtime ;;
    3|data) SCOPE=data ;;
    4|cancel|"")
      echo "Cleanup cancelled before Docker changes."
      exit 0
      ;;
    *)
      echo "Unknown cleanup choice: $choice" >&2
      exit 64
      ;;
  esac
  read -r -p "Also prune all unused Docker build cache? [y/N] " prune_answer
  case "${prune_answer:-N}" in
    y|Y|yes|Yes|YES) PRUNE_BUILD_CACHE=true ;;
  esac
fi

if [ "$SCOPE" != host ]; then
  validate_container_ownership
fi

assert_cxapp_name() {
  kind="$1"
  value="$2"
  case "$value" in
    cxapp|cxapp-*) ;;
    *)
      echo "Refusing to delete $kind outside the CODEXSUN namespace: $value" >&2
      exit 73
      ;;
  esac
}

network=$(env_value CXAPP_DOCKER_NETWORK)
assert_cxapp_name network "$network"

volumes=(
  "$(env_value MARIADB_DATA_VOLUME)"
  "$(env_value MARIADB_BACKUP_VOLUME)"
  "$(env_value REDIS_DATA_VOLUME)"
  "$(env_value MEDIA_DATA_VOLUME)"
  "$(env_value MEDIA_DB_VOLUME)"
  "$(env_value BILLING_STACK_DATA_VOLUME)"
)
for volume in "${volumes[@]}"; do
  assert_cxapp_name volume "$volume"
done

registry=$(env_value CXAPP_IMAGE_REGISTRY)
app_repositories=(
  "$registry/billing-stack-api"
  "$registry/billing-stack-web"
  "$registry/billing-stack-migrations"
)
infrastructure_repositories=(
  "$registry/mariadb"
  "$registry/redis"
  "$registry/media"
)

print_code_resource_list() {
  echo "  Application containers: cxapp-api, cxapp-web"
  if [ "$SCOPE" != app ]; then
    echo "  Infrastructure containers: cxapp-mariadb, cxapp-redis, cxapp-media"
  fi
  echo "  Image repositories:"
  printf '    %s\n' "${app_repositories[@]}"
  if [ "$SCOPE" != app ]; then
    printf '    %s\n' "${infrastructure_repositories[@]}"
  fi
}

echo
case "$SCOPE" in
  app)
    echo "CODEXSUN application-only cleanup"
    print_code_resource_list
    echo "  Preserved: MariaDB, Redis, File Browser, all volumes, network, and both environment files"
    required_confirmation=CLEAN_CXAPP_APP
    ;;
  runtime)
    echo "CODEXSUN runtime cleanup"
    print_code_resource_list
    echo "  Preserved: all databases, Redis data, files, named volumes, network, and both environment files"
    required_confirmation=CLEAN_CXAPP_RUNTIME
    ;;
  data)
    echo "CODEXSUN full local data cleanup"
    print_code_resource_list
    echo "  Network: $network"
    echo "  Permanently deleted named volumes:"
    printf '    %s\n' "${volumes[@]}"
    echo "  Preserved: root .env and .container/deploy.env"
    required_confirmation=CLEAN_CXAPP_DATA
    ;;
  host)
    echo "HOST-WIDE Docker cleanup will permanently remove every local:"
    echo "  Container:"
    docker ps -a --format '    {{.Names}} ({{.Image}})'
    echo "  Custom network:"
    docker network ls --format '{{.Name}}' |
      grep -Ev '^(bridge|host|none)$' |
      sed 's/^/    /' || true
    echo "  Volume:"
    docker volume ls --format '    {{.Name}}'
    echo "  Image:"
    docker image ls --all --format '    {{.Repository}}:{{.Tag}} ({{.ID}})'
    required_confirmation=CLEAN_ALL_DOCKER
    ;;
esac

if [ "$PRUNE_BUILD_CACHE" = true ]; then
  echo "  Build cache: all unused Docker BuildKit cache, including other projects"
fi

if [ "$ASSUME_YES" != true ]; then
  read -r -p "Type $required_confirmation to continue: " confirmation
  [ "$confirmation" = "$required_confirmation" ] || {
    echo "Cleanup cancelled before Docker changes."
    exit 0
  }
fi

remove_project_containers() {
  project="$1"
  mapfile -t container_ids < <(
    docker ps -aq --filter "label=com.docker.compose.project=$project"
  )
  if ((${#container_ids[@]} > 0)); then
    docker rm -f "${container_ids[@]}" >/dev/null
    echo "Removed containers for Compose project: $project"
  fi
}

remove_repository_images() {
  repository="$1"
  mapfile -t image_tags < <(
    docker image ls --all --format '{{.Repository}}:{{.Tag}}' "$repository" |
      grep -F "${repository}:" |
      sort -u || true
  )
  if ((${#image_tags[@]} > 0)); then
    docker image rm -f "${image_tags[@]}" >/dev/null
    echo "Removed images: $repository"
  fi
}

if [ "$SCOPE" = host ]; then
  mapfile -t container_ids < <(docker ps -aq)
  if ((${#container_ids[@]} > 0)); then
    docker rm -f "${container_ids[@]}" >/dev/null
    echo "Removed all local Docker containers."
  fi

  mapfile -t volume_names < <(docker volume ls --quiet)
  if ((${#volume_names[@]} > 0)); then
    docker volume rm "${volume_names[@]}" >/dev/null
    echo "Removed all local Docker volumes."
  fi

  mapfile -t network_names < <(
    docker network ls --format '{{.Name}}' | grep -Ev '^(bridge|host|none)$' || true
  )
  if ((${#network_names[@]} > 0)); then
    docker network rm "${network_names[@]}" >/dev/null
    echo "Removed all custom Docker networks."
  fi

  mapfile -t image_ids < <(docker image ls --all --quiet | sort -u)
  if ((${#image_ids[@]} > 0)); then
    docker image rm -f "${image_ids[@]}" >/dev/null
    echo "Removed all local Docker images."
  fi
else
  remove_project_containers cxapp-billing
  for repository in "${app_repositories[@]}"; do
    remove_repository_images "$repository"
  done

  if [ "$SCOPE" = runtime ] || [ "$SCOPE" = data ]; then
    remove_project_containers cxapp-media
    remove_project_containers cxapp-redis
    remove_project_containers cxapp-mariadb
    for repository in "${infrastructure_repositories[@]}"; do
      remove_repository_images "$repository"
    done
  fi

  if [ "$SCOPE" = data ]; then
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
  fi
fi

if [ "$PRUNE_BUILD_CACHE" = true ]; then
  docker builder prune --all --force
fi

echo "CODEXSUN Docker cleanup completed: scope=$SCOPE"

if [ "$INSTALL_FRESH" = true ]; then
  echo "Starting fresh CODEXSUN installation."
  bash "$PROJECT_ROOT/setup.sh" --non-interactive --yes "$TARGET"
fi
