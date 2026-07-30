#!/usr/bin/env sh
set -eu

CONTAINER_DIR=${CONTAINER_DIR:-$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)}
if [ "$(basename "$CONTAINER_DIR")" = "scripts" ]; then
  CONTAINER_DIR=$(CDPATH= cd -- "$CONTAINER_DIR/.." && pwd)
fi
PROJECT_ROOT=$(CDPATH= cd -- "$CONTAINER_DIR/.." && pwd)
DEPLOY_ENV=$PROJECT_ROOT/.env

env_value() {
  key="$1"
  value=$(grep -E "^${key}=" "$DEPLOY_ENV" 2>/dev/null | tail -n 1 | cut -d= -f2- || true)
  value=$(printf "%s" "$value" | tr -d '\r')
  case "$value" in
    \"*\") value=${value#\"}; value=${value%\"} ;;
    \'*\') value=${value#\'}; value=${value%\'} ;;
  esac
  printf "%s" "$value"
}

require_env_value() {
  key="$1"
  value=$(env_value "$key")
  [ -n "$value" ] || {
    echo "$key is required in $DEPLOY_ENV." >&2
    exit 78
  }
}

prepare_deploy_env() {
  [ -f "$DEPLOY_ENV" ] || {
    echo "Missing deployment environment: $DEPLOY_ENV" >&2
    echo "Run npm run env:configure from the repository root." >&2
    exit 78
  }
}

validate_deploy_env() {
  for key in \
    NODE_ENV NODE_RUNTIME_VERSION NPM_RUNTIME_VERSION NGINX_BASE_IMAGE CODEXSUN_VERSION \
    CODEXSUN_IMAGE_REGISTRY CODEXSUN_DOCKER_NETWORK CODEXSUN_BIND_ADDRESS \
    CODEXSUN_SINGLE_TENANT MARIADB_BASE_IMAGE MARIADB_IMAGE_TAG \
    MARIADB_ROOT_PASSWORD MARIADB_BIND_ADDRESS MARIADB_HOST_PORT \
    MARIADB_DATA_VOLUME MARIADB_BACKUP_VOLUME DB_DRIVER DB_HOST DB_PORT \
    DB_USER DB_PASSWORD DB_MASTER_NAME REDIS_BASE_IMAGE REDIS_IMAGE_TAG \
    REDIS_PASSWORD REDIS_HOST_PORT REDIS_DATA_VOLUME CODEXSUN_QUEUE_BACKEND \
    CODEXSUN_REDIS_URL CODEXSUN_QUEUE_WORKER_ENABLED FILEBROWSER_BASE_IMAGE \
    MEDIA_IMAGE_TAG MEDIA_HOST_PORT MEDIA_ADMIN_USER MEDIA_ADMIN_PASSWORD \
    MEDIA_DATA_VOLUME MEDIA_DB_VOLUME BILLING_STACK_API_IMAGE_TAG \
    BILLING_STACK_WEB_IMAGE_TAG BILLING_STACK_MIGRATIONS_IMAGE_TAG \
    BILLING_STACK_DATA_VOLUME JWT_SECRET AUTH_MODE AUTH_SESSION_TTL_HOURS \
    AUTH_SESSION_RENEWAL_HOURS PLATFORM_API_PORT PLATFORM_WEB_PORT \
    PLATFORM_WEB_ORIGIN PLATFORM_API_URL CODEXSUN_WEB_HOST \
    CODEXSUN_WEB_HOST_ALT CODEXSUN_MEDIA_HOST SUPER_ADMIN_NAME \
    SUPER_ADMIN_EMAIL SUPER_ADMIN_PASSWORD SOFTWARE_ADMIN_NAME \
    SOFTWARE_ADMIN_EMAIL SOFTWARE_ADMIN_PASSWORD TENANT_ADMIN_NAME \
    TENANT_ADMIN_EMAIL TENANT_ADMIN_PASSWORD CODEXSUN_DB_FRESH_ON_START \
    CODEXSUN_ALLOW_PRODUCTION_DB_RESET CODEXSUN_VERIFIED_BACKUP_ID \
    ENABLE_DEFAULT_TENANT_SEED \
    DEFAULT_TENANT_CORPORATE_ID DEFAULT_TENANT_DB_NAME DEFAULT_TENANT_DOMAIN \
    DEFAULT_TENANT_NAME DEFAULT_TENANT_SLUG DEFAULT_TENANT_ADMIN_NAME \
    DEFAULT_TENANT_ADMIN_EMAIL DEFAULT_TENANT_ADMIN_PASSWORD TENANT_DOMAIN_BASE; do
    require_env_value "$key"
  done

  [ "$(env_value CODEXSUN_DB_FRESH_ON_START)" = "0" ] || {
    echo "CODEXSUN_DB_FRESH_ON_START must remain 0 for deployment." >&2
    exit 78
  }
  [ "$(env_value CODEXSUN_ALLOW_PRODUCTION_DB_RESET)" = "0" ] || {
    echo "CODEXSUN_ALLOW_PRODUCTION_DB_RESET must remain 0 for deployment." >&2
    exit 78
  }
  [ "$(env_value DB_MASTER_NAME)" != "$(env_value DEFAULT_TENANT_DB_NAME)" ] || {
    echo "DB_MASTER_NAME and DEFAULT_TENANT_DB_NAME must be different databases." >&2
    exit 78
  }
  [ "$(env_value NODE_ENV)" = "production" ] || {
    echo "NODE_ENV must be production for container deployment." >&2
    exit 78
  }

  if [ "$(env_value MAIL_ENABLED)" = "1" ]; then
    require_env_value MAIL_SMTP_HOST
    require_env_value MAIL_FROM_EMAIL
  fi

  if [ "$(env_value CODEXSUN_SINGLE_TENANT)" = "1" ]; then
    [ "$(env_value ENABLE_DEFAULT_TENANT_SEED)" = "1" ] || {
      echo "CODEXSUN_SINGLE_TENANT=1 requires ENABLE_DEFAULT_TENANT_SEED=1." >&2
      exit 78
    }
  fi
}

require_docker() {
  docker info >/dev/null 2>&1 || {
    echo "Docker Engine is not reachable." >&2
    exit 69
  }
}

ensure_network() {
  network=$(env_value CODEXSUN_DOCKER_NETWORK)
  docker network inspect "$network" >/dev/null 2>&1 || docker network create "$network" >/dev/null
}

ensure_media_volumes() {
  for volume in "$(env_value MEDIA_DATA_VOLUME)" "$(env_value MEDIA_DB_VOLUME)"; do
    docker volume inspect "$volume" >/dev/null 2>&1 || docker volume create "$volume" >/dev/null
  done
}

stack_compose() {
  stack="$1"
  shift
  docker compose --env-file "$DEPLOY_ENV" -f "$CONTAINER_DIR/$stack/docker-compose.yml" "$@"
}

run_preflight() {
  prepare_deploy_env
  validate_deploy_env
  require_docker
  ensure_network
}
