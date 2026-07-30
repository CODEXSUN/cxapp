#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=.container/scripts/common.sh
. "$SCRIPT_DIR/scripts/common.sh"

REINSTALL=false
WIPE_MEDIA=false
SETUP_COMPLETE=false

for arg in "$@"; do
  case "$arg" in
    --reinstall|--clean|--fresh) REINSTALL=true ;;
    --wipe-media) WIPE_MEDIA=true ;;
    -h|--help)
      echo "Usage: .container/setup-media.sh [--reinstall] [--wipe-media]"
      echo "  --reinstall   Recreate File Browser metadata; uploaded media is preserved."
      echo "  --wipe-media  With --reinstall, also remove uploaded media (destructive)."
      exit 0
      ;;
    *) echo "Unknown option: $arg" >&2; exit 64 ;;
  esac
done

if [ "$WIPE_MEDIA" = "true" ] && [ "$REINSTALL" != "true" ]; then
  echo "--wipe-media must be combined with --reinstall." >&2
  exit 64
fi

run_preflight
ensure_media_volumes

media_data=$(env_value MEDIA_DATA_VOLUME codexsun-media-data)
media_db=$(env_value MEDIA_DB_VOLUME codexsun-media-db)
media_user=$(env_value MEDIA_ADMIN_USER admin)
media_password=$(env_value MEDIA_ADMIN_PASSWORD "")
registry=$(env_value CODEXSUN_IMAGE_REGISTRY codexsun)
media_tag=$(env_value MEDIA_IMAGE_TAG 1.0.42-filebrowser2.63.5)
media_image="${registry}/media:${media_tag}"

cleanup_on_error() {
  exit_code=$?
  if [ "$exit_code" -ne 0 ] && [ "$SETUP_COMPLETE" != "true" ]; then
    echo "Media setup failed; attempting to restore the existing service." >&2
    stack_compose media up -d --no-build >/dev/null 2>&1 || true
  fi
}
trap cleanup_on_error EXIT

remove_volume_verified() {
  volume="$1"
  if ! docker volume inspect "$volume" >/dev/null 2>&1; then
    echo "Volume already absent: $volume"
    return
  fi
  users=$(docker ps -a --filter "volume=$volume" --format '{{.Names}}')
  [ -z "$users" ] || {
    echo "Cannot remove $volume; attached containers:" >&2
    printf '%s\n' "$users" >&2
    exit 73
  }
  docker volume rm "$volume" >/dev/null || {
    echo "Docker failed to remove volume: $volume" >&2
    exit 74
  }
  ! docker volume inspect "$volume" >/dev/null 2>&1 || {
    echo "Volume still exists after removal: $volume" >&2
    exit 74
  }
  echo "Removed volume: $volume"
}

stack_compose media build

if [ "$REINSTALL" = "true" ]; then
  if [ "$WIPE_MEDIA" = "true" ]; then
    users=$(docker ps -a --filter "volume=$media_data" --format '{{.Names}}' \
      | grep -Ev '^codexsun-media$' || true)
    [ -z "$users" ] || {
      echo "Cannot wipe media while these containers use it:" >&2
      printf '%s\n' "$users" >&2
      exit 73
    }
  fi

  stack_compose media down --remove-orphans
  remove_volume_verified "$media_db"
  if [ "$WIPE_MEDIA" = "true" ]; then
    remove_volume_verified "$media_data"
  else
    echo "Uploaded media volume preserved."
  fi
  ensure_media_volumes
fi

stack_compose media stop media >/dev/null 2>&1 || true

docker run --rm \
  --user 0:0 \
  --entrypoint sh \
  -e MEDIA_ADMIN_USER="$media_user" \
  -e MEDIA_ADMIN_PASSWORD="$media_password" \
  -v "$media_data:/srv" \
  -v "$media_db:/database" \
  "$media_image" \
  -lc 'mkdir -p /srv /database && chmod 0775 /srv /database || true
    filebrowser config init --database /database/filebrowser.db >/dev/null 2>&1 || true
    filebrowser config set --root /srv --scope / --minimumPasswordLength 1 \
      --database /database/filebrowser.db >/dev/null
    filebrowser users update "$MEDIA_ADMIN_USER" \
      --password "$MEDIA_ADMIN_PASSWORD" --scope / \
      --perm.admin --perm.create --perm.delete --perm.download \
      --perm.modify --perm.rename --perm.share \
      --database /database/filebrowser.db >/dev/null 2>&1 \
    || filebrowser users add "$MEDIA_ADMIN_USER" "$MEDIA_ADMIN_PASSWORD" \
      --scope / --perm.admin --perm.create --perm.delete --perm.download \
      --perm.modify --perm.rename --perm.share \
      --database /database/filebrowser.db >/dev/null'

stack_compose media up -d --no-build --wait --wait-timeout 120
stack_compose media ps
SETUP_COMPLETE=true
echo "Media ready. Admin password is sourced from the deployment input and is not printed."
