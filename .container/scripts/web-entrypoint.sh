#!/usr/bin/env sh
set -eu

source_dir="/opt/codexsun-web/platform"
: "${PLATFORM_API_PORT:=17010}"

rm -rf /usr/share/nginx/html/*
cp -a "$source_dir/." /usr/share/nginx/html/
envsubst '${PLATFORM_API_PORT}' \
  < /etc/nginx/conf.d/default.conf \
  > /etc/nginx/conf.d/default.conf.tmp
mv /etc/nginx/conf.d/default.conf.tmp /etc/nginx/conf.d/default.conf
exec nginx -g 'daemon off;'
