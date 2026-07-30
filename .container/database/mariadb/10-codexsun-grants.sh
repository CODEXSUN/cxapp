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

db_user=${CODEXSUN_DB_USER:-root}
db_password=${CODEXSUN_DB_PASSWORD:-${MARIADB_ROOT_PASSWORD}}
escaped_user=$(printf '%s' "$db_user" | sed "s/'/''/g")
escaped_password=$(printf '%s' "$db_password" | sed "s/'/''/g")

apply_grants <<SQL
CREATE USER IF NOT EXISTS '${escaped_user}'@'%' IDENTIFIED BY '${escaped_password}';
ALTER USER '${escaped_user}'@'%' IDENTIFIED BY '${escaped_password}';
GRANT ALL PRIVILEGES ON *.* TO '${escaped_user}'@'%' WITH GRANT OPTION;
FLUSH PRIVILEGES;
SQL
