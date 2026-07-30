# CODEXSUN Container Deployment

This directory provides one persistent infrastructure layer and the composed CODEXSUN Platform runtime.

| Product  | Source composition                                | Runtime services          |
| -------- | ------------------------------------------------- | ------------------------- |
| CODEXSUN | Framework + UI + Platform + Core + Billing + Mail | Platform API/Platform Web |

MariaDB, Redis, and Media are installed once. Product deployment commands never recreate them and never delete their named volumes. Normal upgrades replace only versioned application containers, so databases, credentials, uploads, and application storage remain stable.

## First installation

Docker Desktop or Docker Engine with Compose v2 is required. From the repository root:

```bash
bash .container/setup.sh billing
```

From Windows PowerShell with Git for Windows installed:

```powershell
& 'C:\Program Files\Git\bin\bash.exe' .container/setup.sh billing
```

After infrastructure installation and before starting the application images, refresh and verify the exact Node/npm toolchain declared by the development workspace:

```bash
bash .container/update-runtime.sh
```

`setup.sh` runs this command automatically. It updates `NODE_RUNTIME_VERSION` and `NPM_RUNTIME_VERSION` from `package.json`, pulls the matching Node base image, and verifies npm before the application build starts.

On first use, `prepare-env.sh` creates the ignored `.container/deploy.env`. Database, super-admin, software-admin, and tenant-admin values are imported from the repository `.env`; missing infrastructure secrets are generated. The default deployment uses the Platform master database `codexsun_master_db` plus exactly one seeded tenant: `CODEXSUN`, backed by `codexsun_db`, with Billing and Mail enabled. Once created, deployment credentials are retained across subsequent setup and upgrade runs. Review the file before production use, especially public origins, registry, administrator values, and `CODEXSUN_VERIFIED_BACKUP_ID`.

Mail is available to the tenant by default. Configure `MAIL_ENABLED` and the `MAIL_SMTP_*`/`MAIL_FROM_*` values in `deploy.env` only when a verified SMTP provider is ready; tenant company Mail settings continue to take priority over this deployment fallback.

`PLATFORM_API_PORT` and `PLATFORM_WEB_PORT` are the only published application port settings. `PLATFORM_API_URL` is the internal/server endpoint for the composed API. Browser builds use the same-origin `/api/platform` path; local Vite and the runtime nginx container proxy that path to Platform API. Core, Billing, Mail, and Platform all use that same composed API.

`PLATFORM_WEB_ORIGIN` is the canonical public Web origin and the only configured CORS source. Development automatically accepts `localhost` and `127.0.0.1` on `PLATFORM_WEB_PORT`. For live cloud deployment, set the canonical origin to its exact HTTPS value. Normal Platform Web traffic remains same-origin through `/api/platform` and does not depend on CORS. Never use wildcard CORS with credentialed requests.

Platform Web sends `Permissions-Policy: unload=*` in development and from the runtime nginx container. This temporarily permits legacy `unload` listeners, including browser-extension injected frames, during Chromium's staged deprecation. No other browser permission is widened.

MariaDB listens inside Docker on `3306` and is exposed to the host at `127.0.0.1:3307` by default. Applications use the private `codexsun-mariadb:3306` address.

## Clean installation

The cleanup helper deletes CODEXSUN containers, images, network, and persistent
volumes, then optionally installs the complete stack again:

```bash
bash .container/clean.sh --yes --install billing
```

This permanently deletes the Platform master database, `codexsun_db`, Redis
state, uploaded Media, application storage, and database backups stored in the
named CODEXSUN volumes. It preserves `.container/deploy.env`.

Docker does not expose reliable per-project ownership for BuildKit cache. To
also remove all unused local Docker build cache, including cache from other
projects, explicitly add:

```bash
bash .container/clean.sh --yes --all-build-cache --install billing
```

Without `--yes`, the helper requires the exact confirmation
`CLEAN_CODEXSUN`. It refuses to remove a network or volume whose configured
name is outside the `codexsun` namespace.

For a deliberately host-wide reset that removes every Docker container, custom
network, volume, image, and build cache before reinstalling CODEXSUN, use:

```bash
bash .container/clean.sh --yes --all-docker --install billing
```

Without `--yes`, host-wide cleanup requires `CLEAN_ALL_DOCKER`. Use
`--all-docker` only on a Docker host where every local Docker resource is
intended to be destroyed.

## Development and release updates

For a local source update, rebuild and replace only the selected product:

```bash
bash .container/deploy.sh billing up
```

For a production-style immutable update, publish versioned images to a registry and pull them on the server:

```bash
# Build machine / CI
CODEXSUN_IMAGE_REGISTRY=registry.example.com/codexsun \
  bash .container/deploy.sh billing publish

# Deployment host
CODEXSUN_IMAGE_REGISTRY=registry.example.com/codexsun \
  bash .container/deploy.sh billing upgrade
```

`upgrade` pulls the selected version, runs its safe forward migrations, and recreates only that product's containers. It does not change `.container/deploy.env`, MariaDB, Redis, Media, uploads, or named volumes. Increment the root workspace version before publishing a new immutable release tag. Authenticate Docker to a private registry before `publish` or `upgrade`.

Available actions are:

```bash
bash .container/deploy.sh PRODUCT up
bash .container/deploy.sh PRODUCT --reinstall
bash .container/deploy.sh PRODUCT build
bash .container/deploy.sh PRODUCT publish
bash .container/deploy.sh PRODUCT upgrade
bash .container/deploy.sh PRODUCT migrate
bash .container/deploy.sh PRODUCT ps
bash .container/deploy.sh PRODUCT logs
bash .container/deploy.sh PRODUCT down
```

`--reinstall` performs a no-cache rebuild of the selected application stack while preserving all named volumes. `down` also preserves volumes. There is intentionally no implicit destructive reset command.

## Persistent resources

The stable Docker volumes include MariaDB data/backups, Redis data, Media files/metadata, and per-product application storage. MariaDB owns the Platform master database and tenant databases.

Before a production database migration, set `CODEXSUN_VERIFIED_BACKUP_ID` to the verified backup run ID. For a confirmed empty first install, record a unique marker such as `initial-empty-database-YYYYMMDD`.

Media administration can be reconciled independently:

```bash
bash .container/setup-media.sh
```

Only the explicit `--reinstall --wipe-media` combination removes media data; the helper validates mounts and targets before doing so.

## Default host ports

All published ports bind to `127.0.0.1` unless `CODEXSUN_BIND_ADDRESS` is changed.

| Service                 |                Host port |
| ----------------------- | -----------------------: |
| MariaDB / Redis / Media | `3307` / `6379` / `7090` |
| Platform API/Web        |        `17010` / `17020` |

## Verification

With CODEXSUN running:

```bash
bash .container/smoke-test.sh
```

The smoke test checks Platform API/Web, Media, authenticated Redis access, MariaDB, the Platform master database, and—when enabled—the default tenant database with Billing and Mail active.
