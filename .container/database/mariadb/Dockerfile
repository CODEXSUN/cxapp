ARG MARIADB_BASE_IMAGE
FROM ${MARIADB_BASE_IMAGE}

ARG CODEXSUN_VERSION
LABEL org.opencontainers.image.title="CODEXSUN MariaDB" \
      org.opencontainers.image.version="$CODEXSUN_VERSION"

COPY .container/database/mariadb/50-codexsun-server.cnf /etc/mysql/mariadb.conf.d/50-codexsun-server.cnf
COPY .container/database/mariadb/10-codexsun-grants.sh /docker-entrypoint-initdb.d/10-codexsun-grants.sh
