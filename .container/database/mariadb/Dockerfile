ARG MARIADB_BASE_IMAGE=mariadb:11.8
FROM ${MARIADB_BASE_IMAGE}

ARG CODEXSUN_VERSION=1.0.42
LABEL org.opencontainers.image.title="CODEXSUN MariaDB" \
      org.opencontainers.image.version="$CODEXSUN_VERSION"

COPY .container/database/mariadb/50-codexsun-server.cnf /etc/mysql/mariadb.conf.d/50-codexsun-server.cnf
COPY .container/database/mariadb/10-codexsun-grants.sh /docker-entrypoint-initdb.d/10-codexsun-grants.sh
