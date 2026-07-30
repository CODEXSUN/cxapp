ARG MARIADB_BASE_IMAGE
FROM ${MARIADB_BASE_IMAGE}

ARG CXAPP_VERSION
LABEL org.opencontainers.image.title="CODEXSUN MariaDB" \
      org.opencontainers.image.version="$CXAPP_VERSION"

COPY .container/database/mariadb/50-cxapp-server.cnf /etc/mysql/mariadb.conf.d/50-cxapp-server.cnf
COPY .container/database/mariadb/10-cxapp-grants.sh /docker-entrypoint-initdb.d/10-cxapp-grants.sh
