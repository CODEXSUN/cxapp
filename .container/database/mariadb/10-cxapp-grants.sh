#!/usr/bin/env bash
set -euo pipefail

# CODEXSUN provisions one database per tenant. The deployment app user needs
# dynamic database lifecycle privileges and remains isolated inside this server.
# This file is both a first-initialization hook and a setup-time reconciliation.
apply_grants() {
  if declare -F docker_process_sql >/dev/null 2>&1; then
    docker_process_sql
  else
    mariadb --protocol=socket -uroot -p"${MARIADB_ROOT_PASSWORD}"
  fi
}

: "${CXAPP_DB_USER:?CXAPP_DB_USER is required}"
: "${CXAPP_DB_PASSWORD:?CXAPP_DB_PASSWORD is required}"
: "${FILE_MANAGER_DB_NAME:?FILE_MANAGER_DB_NAME is required}"
: "${FILE_MANAGER_DB_USER:?FILE_MANAGER_DB_USER is required}"
: "${FILE_MANAGER_DB_PASSWORD:?FILE_MANAGER_DB_PASSWORD is required}"
: "${MARIADB_ROOT_PASSWORD:?MARIADB_ROOT_PASSWORD is required}"
db_user=$CXAPP_DB_USER
db_password=$CXAPP_DB_PASSWORD
escaped_user=$(printf '%s' "$db_user" | sed "s/'/''/g")
escaped_password=$(printf '%s' "$db_password" | sed "s/'/''/g")
file_manager_db=$FILE_MANAGER_DB_NAME
case "$file_manager_db" in
  ""|*[!A-Za-z0-9_]*) echo "Unsafe FILE_MANAGER_DB_NAME: $file_manager_db" >&2; exit 78 ;;
esac
file_manager_user=$(printf '%s' "$FILE_MANAGER_DB_USER" | sed "s/'/''/g")
file_manager_password=$(printf '%s' "$FILE_MANAGER_DB_PASSWORD" | sed "s/'/''/g")

apply_grants <<SQL
CREATE USER IF NOT EXISTS '${escaped_user}'@'%' IDENTIFIED BY '${escaped_password}';
ALTER USER '${escaped_user}'@'%' IDENTIFIED BY '${escaped_password}';
GRANT ALL PRIVILEGES ON *.* TO '${escaped_user}'@'%' WITH GRANT OPTION;
CREATE DATABASE IF NOT EXISTS \`${file_manager_db}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${file_manager_user}'@'%' IDENTIFIED BY '${file_manager_password}';
ALTER USER '${file_manager_user}'@'%' IDENTIFIED BY '${file_manager_password}';
GRANT ALL PRIVILEGES ON \`${file_manager_db}\`.* TO '${file_manager_user}'@'%';
FLUSH PRIVILEGES;
SQL
