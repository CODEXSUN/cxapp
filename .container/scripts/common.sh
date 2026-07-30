#!/usr/bin/env sh
set -eu

CONTAINER_DIR=${CONTAINER_DIR:-$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)}
if [ "$(basename "$CONTAINER_DIR")" = "scripts" ]; then
  CONTAINER_DIR=$(CDPATH= cd -- "$CONTAINER_DIR/.." && pwd)
fi
PROJECT_ROOT=$(CDPATH= cd -- "$CONTAINER_DIR/.." && pwd)
DEPLOY_ENV=${CODEXSUN_DEPLOY_ENV:-$CONTAINER_DIR/deploy.env}

env_value() {
  key="$1"
  default_value=${2:-}
  value=$(grep -E "^${key}=" "$DEPLOY_ENV" 2>/dev/null | tail -n 1 | cut -d= -f2- || true)
  printf "%s" "${value:-$default_value}"
}

repo_env_value() {
  key="$1"
  value=$(grep -E "^${key}=" "$PROJECT_ROOT/.env" 2>/dev/null | tail -n 1 | cut -d= -f2- || true)
  value=$(printf "%s" "$value" | tr -d '\r')
  case "$value" in
    \"*\") value=${value#\"}; value=${value%\"} ;;
    \'*\') value=${value#\'}; value=${value%\'} ;;
  esac
  printf "%s" "$value"
}

set_env_value() {
  key="$1"
  value="$2"
  tmp="$DEPLOY_ENV.tmp"
  KEY="$key" VALUE="$value" awk '
    BEGIN { found = 0 }
    index($0, ENVIRON["KEY"] "=") == 1 {
      print ENVIRON["KEY"] "=" ENVIRON["VALUE"]
      found = 1
      next
    }
    { print }
    END { if (!found) print ENVIRON["KEY"] "=" ENVIRON["VALUE"] }
  ' "$DEPLOY_ENV" > "$tmp"
  mv "$tmp" "$DEPLOY_ENV"
}

generate_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
  elif command -v node >/dev/null 2>&1; then
    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  else
    od -An -N32 -tx1 /dev/urandom | tr -d ' \n'
  fi
}

ensure_secret() {
  key="$1"
  value=$(env_value "$key" "")
  case "$value" in
    ""|change_this*)
      set_env_value "$key" "$(generate_secret)"
      echo "Generated $key."
      ;;
  esac
}

set_default_if_empty() {
  key="$1"
  default_value="$2"
  [ -n "$(env_value "$key" "")" ] || set_env_value "$key" "$default_value"
}

import_repo_value() {
  key="$1"
  current=$(env_value "$key" "")
  case "$current" in
    ""|change_this*) ;;
    *) return ;;
  esac
  value=$(repo_env_value "$key")
  if [ -n "$value" ]; then
    set_env_value "$key" "$value"
    echo "Imported $key from repository .env."
  fi
}

prepare_deploy_env() {
  if [ ! -f "$DEPLOY_ENV" ]; then
    cp "$CONTAINER_DIR/deploy.env.example" "$DEPLOY_ENV"
    echo "Created $DEPLOY_ENV."
  fi

  version=$(grep -m1 '"version"' "$PROJECT_ROOT/package.json" | cut -d'"' -f4)
  node_version=$(grep -m1 -E '"node"[[:space:]]*:' "$PROJECT_ROOT/package.json" | cut -d'"' -f4 | sed 's/^[^0-9]*//')
  npm_version=$(grep -m1 '"packageManager"' "$PROJECT_ROOT/package.json" | cut -d'"' -f4 | sed 's/^npm@//')
  set_env_value CODEXSUN_VERSION "$version"
  set_env_value NODE_RUNTIME_VERSION "$node_version"
  set_env_value NPM_RUNTIME_VERSION "$npm_version"
  set_env_value MARIADB_IMAGE_TAG "11.8-codexsun-${version}"
  set_env_value REDIS_IMAGE_TAG "7.4-codexsun-${version}"
  set_env_value MEDIA_IMAGE_TAG "${version}-filebrowser2.63.5"
  set_env_value BILLING_STACK_API_IMAGE_TAG "$version"
  set_env_value BILLING_STACK_WEB_IMAGE_TAG "$version"
  set_env_value BILLING_STACK_MIGRATIONS_IMAGE_TAG "$version"
  set_default_if_empty CODEXSUN_SINGLE_TENANT 1
  set_default_if_empty MARIADB_BIND_ADDRESS 127.0.0.1
  set_default_if_empty PLATFORM_WEB_ORIGINS ""
  set_default_if_empty CODEXSUN_WEB_HOST codexsun.com
  set_default_if_empty CODEXSUN_WEB_HOST_ALT www.codexsun.com
  set_default_if_empty CODEXSUN_MEDIA_HOST files.codexsun.com

  for key in \
    DB_USER DB_PASSWORD DB_MASTER_NAME JWT_SECRET \
    SUPER_ADMIN_NAME SUPER_ADMIN_EMAIL SUPER_ADMIN_PASSWORD \
    SOFTWARE_ADMIN_NAME SOFTWARE_ADMIN_EMAIL SOFTWARE_ADMIN_PASSWORD \
    TENANT_ADMIN_NAME TENANT_ADMIN_EMAIL TENANT_ADMIN_PASSWORD \
    DEFAULT_TENANT_ADMIN_NAME DEFAULT_TENANT_ADMIN_EMAIL DEFAULT_TENANT_ADMIN_PASSWORD \
    MAIL_ENABLED MAIL_SMTP_HOST MAIL_SMTP_PORT MAIL_SMTP_SECURE \
    MAIL_USERNAME MAIL_PASSWORD MAIL_FROM_EMAIL MAIL_FROM_NAME MAIL_REPLY_TO \
    GSP_SANDBOX_BASE_URL GSP_BASE_URL; do
    import_repo_value "$key"
  done

  set_default_if_empty MAIL_ENABLED 0
  set_default_if_empty MAIL_SMTP_HOST ""
  set_default_if_empty MAIL_SMTP_PORT 587
  set_default_if_empty MAIL_SMTP_SECURE 0
  set_default_if_empty MAIL_USERNAME ""
  set_default_if_empty MAIL_PASSWORD ""
  set_default_if_empty MAIL_FROM_EMAIL ""
  set_default_if_empty MAIL_FROM_NAME CODEXSUN
  set_default_if_empty MAIL_REPLY_TO ""

  ensure_secret DB_PASSWORD
  ensure_secret MARIADB_ROOT_PASSWORD
  ensure_secret REDIS_PASSWORD
  ensure_secret JWT_SECRET

  if [ "$(env_value DB_USER root)" = "root" ]; then
    set_env_value MARIADB_ROOT_PASSWORD "$(env_value DB_PASSWORD "")"
  fi

  super_password=$(env_value SUPER_ADMIN_PASSWORD "")
  if [ -n "$super_password" ]; then
    set_env_value MEDIA_ADMIN_PASSWORD "$super_password"
    echo "Media admin password synchronized with SUPER_ADMIN_PASSWORD."
  else
    ensure_secret MEDIA_ADMIN_PASSWORD
  fi

  redis_password=$(env_value REDIS_PASSWORD "")
  set_env_value CODEXSUN_REDIS_URL "redis://:${redis_password}@codexsun-redis:6379/0"

  if [ "$(env_value ENABLE_DEFAULT_TENANT_SEED 0)" = "1" ]; then
    set_default_if_empty DEFAULT_TENANT_CORPORATE_ID CODEXSUN
    set_default_if_empty DEFAULT_TENANT_DB_NAME codexsun_db
    set_default_if_empty DEFAULT_TENANT_DOMAIN codexsun.com
    set_default_if_empty DEFAULT_TENANT_NAME CODEXSUN
    set_default_if_empty DEFAULT_TENANT_SLUG codexsun
    set_default_if_empty DEFAULT_TENANT_ADMIN_NAME "$(env_value TENANT_ADMIN_NAME "$(env_value SUPER_ADMIN_NAME "CODEXSUN Admin")")"
    set_default_if_empty DEFAULT_TENANT_ADMIN_EMAIL "$(env_value TENANT_ADMIN_EMAIL "$(env_value SUPER_ADMIN_EMAIL "")")"
    set_default_if_empty DEFAULT_TENANT_ADMIN_PASSWORD "$(env_value TENANT_ADMIN_PASSWORD "$(env_value SUPER_ADMIN_PASSWORD "")")"
    echo "Default tenant seed configuration prepared."
  fi

  chmod 600 "$DEPLOY_ENV" 2>/dev/null || true
}

validate_deploy_env() {
  [ "$(env_value CODEXSUN_DB_FRESH_ON_START 0)" = "0" ] || {
    echo "CODEXSUN_DB_FRESH_ON_START must remain 0 for deployment." >&2
    exit 78
  }
  [ "$(env_value CODEXSUN_ALLOW_PRODUCTION_DB_RESET 0)" = "0" ] || {
    echo "CODEXSUN_ALLOW_PRODUCTION_DB_RESET must remain 0 for deployment." >&2
    exit 78
  }
  if [ "$(env_value ENABLE_DEFAULT_TENANT_SEED 0)" = "1" ]; then
    for key in \
      DEFAULT_TENANT_CORPORATE_ID DEFAULT_TENANT_DB_NAME \
      DEFAULT_TENANT_DOMAIN DEFAULT_TENANT_NAME DEFAULT_TENANT_SLUG \
      DEFAULT_TENANT_ADMIN_NAME DEFAULT_TENANT_ADMIN_EMAIL \
      DEFAULT_TENANT_ADMIN_PASSWORD; do
      [ -n "$(env_value "$key" "")" ] || {
        echo "$key is required when ENABLE_DEFAULT_TENANT_SEED=1." >&2
        exit 78
      }
    done
  fi

  master_database=$(env_value DB_MASTER_NAME "")
  tenant_database=$(env_value DEFAULT_TENANT_DB_NAME "")
  [ -n "$master_database" ] || {
    echo "DB_MASTER_NAME is required." >&2
    exit 78
  }
  [ "$master_database" != "$tenant_database" ] || {
    echo "DB_MASTER_NAME and DEFAULT_TENANT_DB_NAME must be different databases." >&2
    exit 78
  }

  if [ "$(env_value CODEXSUN_SINGLE_TENANT 1)" = "1" ]; then
    [ "$(env_value ENABLE_DEFAULT_TENANT_SEED 0)" = "1" ] || {
      echo "CODEXSUN_SINGLE_TENANT=1 requires ENABLE_DEFAULT_TENANT_SEED=1." >&2
      exit 78
    }
    [ "$(env_value DEFAULT_TENANT_CORPORATE_ID "")" = "CODEXSUN" ] || {
      echo "Single-tenant deployment requires DEFAULT_TENANT_CORPORATE_ID=CODEXSUN." >&2
      exit 78
    }
    [ "$tenant_database" = "codexsun_db" ] || {
      echo "Single-tenant deployment requires DEFAULT_TENANT_DB_NAME=codexsun_db." >&2
      exit 78
    }
    [ "$(env_value DEFAULT_TENANT_SLUG "")" = "codexsun" ] || {
      echo "Single-tenant deployment requires DEFAULT_TENANT_SLUG=codexsun." >&2
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
  network=$(env_value CODEXSUN_DOCKER_NETWORK codexsun-network)
  docker network inspect "$network" >/dev/null 2>&1 || docker network create "$network" >/dev/null
}

ensure_media_volumes() {
  for volume in \
    "$(env_value MEDIA_DATA_VOLUME codexsun-media-data)" \
    "$(env_value MEDIA_DB_VOLUME codexsun-media-db)"; do
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
