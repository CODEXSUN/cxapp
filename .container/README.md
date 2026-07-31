# CODEXSUN Container Deployment

This directory provides one persistent infrastructure layer and the composed CODEXSUN Platform runtime.

| Product  | Source composition                                | Runtime services          |
| -------- | ------------------------------------------------- | ------------------------- |
| CODEXSUN | Framework + UI + Platform + Core + Billing + Mail | Platform API/Platform Web |

MariaDB, Redis, and Media are installed once. Product deployment commands never recreate them and never delete their named volumes. Normal upgrades replace only versioned application containers, so databases, credentials, uploads, and application storage remain stable.

## First installation

Docker Desktop or Docker Engine with Compose v2 is required. From the repository root:

```bash
bash prepare-env.sh
bash setup.sh
```

The preparation command creates or updates `.container/deploy.env` from
`.container/deploy.env.sample` without reading root `.env`. The setup command
requires that prepared file, validates it, reviews the deployment plan, and
installs the complete container stack.

Node.js and npm are not required on a Linux deployment host.
`prepare-env.sh` uses host Node.js when available. Otherwise it runs the
environment tool through the exact Docker Node version declared by
`package.json`. Docker Engine and Compose v2 remain required.

For non-interactive installation, first provide every administrator credential
in `.container/deploy.env`, then run:

```bash
bash prepare-env.sh --non-interactive
bash setup.sh --yes
```

From Windows PowerShell with Git for Windows installed:

```powershell
& 'C:\Program Files\Git\bin\bash.exe' prepare-env.sh
& 'C:\Program Files\Git\bin\bash.exe' setup.sh
```

After infrastructure installation and before starting the application images, refresh and verify the exact Node/npm toolchain declared by the development workspace:

```bash
bash .container/update-runtime.sh
```

`setup.sh` runs this command automatically. It updates `NODE_RUNTIME_VERSION` and `NPM_RUNTIME_VERSION` from `package.json`, pulls the matching Node base image, and verifies npm before the application build starts.

The ignored root `.env` is development-only. The ignored
`.container/deploy.env` is the only container deployment source, and
`.container/deploy.env.sample` contains shareable production defaults without
real credentials. Root `prepare-env.sh` creates or updates the private
deployment file through the environment configurator. Root `setup.sh` never
creates deployment configuration and never reads development `.env`.

The configurator preserves existing deployment values by default and shows the
exact current `.container/deploy.env` value beside each non-secret prompt.
Secret prompts show only `[configured]`, hide input, and cover MariaDB, Redis,
File Browser, super administrator, software administrator, tenant
administrator, and default-tenant administrator credentials.

For an automated host, securely provision administrator credentials in
`.container/deploy.env` through the cloud secret manager first. Then
`bash prepare-env.sh --non-interactive` fills documented non-secret deployment
values, generates only missing infrastructure secrets, and validates the
result. Use `--set=KEY=VALUE` only for non-secret settings; credentials must
not be passed through command-line arguments.

Configure `MAIL_ENABLED` and the `MAIL_SMTP_*`/`MAIL_FROM_*` values in
`.container/deploy.env` only when a verified SMTP provider is ready; tenant
company Mail settings continue to take priority over this deployment fallback.

`PLATFORM_API_PORT` and `PLATFORM_WEB_PORT` are the only application listener settings. The runtime derives API/Web bind addresses from `NODE_ENV`, and composed server packages call Platform API through loopback on `PLATFORM_API_PORT`. Browser builds use the same-origin `/api/platform` path; local Vite derives its proxy target from the API port, while runtime nginx uses the Compose `platform-api` service name. Core, Billing, Mail, and Platform all use that same composed API.

`PLATFORM_WEB_ORIGIN` is the only canonical Web/CORS input. Vite derives its allowed hosts from that hostname plus the local development aliases, and the API derives equivalent local CORS origins on `PLATFORM_WEB_PORT`. For live cloud deployment, set the canonical origin to its exact HTTPS value. Normal Platform Web traffic remains same-origin through `/api/platform` and does not depend on CORS. Never use wildcard CORS with credentialed requests.

Platform Web sends `Permissions-Policy: unload=*` in development and from the runtime nginx container. This temporarily permits legacy `unload` listeners, including browser-extension injected frames, during Chromium's staged deprecation. No other browser permission is widened.

MariaDB listens inside Docker on `3306` and is exposed to the host at `127.0.0.1:3307` by default. Applications use the private `cxapp-mariadb:3306` address.

## Clean installation

For a guided cleanup followed by installation, run:

```bash
bash setup.sh --clean
```

The interactive menu provides three CODEXSUN-owned scopes:

- `app`: remove only `cxapp-api`, `cxapp-web`, and application images.
- `runtime`: remove all CODEXSUN containers and images while preserving every
  named volume, database, Redis record, uploaded file, and the network.
- `data`: remove all CODEXSUN containers, images, persistent volumes, and the
  CODEXSUN network. Both environment files remain.

Pruning all unused Docker build cache is offered separately because Docker
cannot reliably attribute BuildKit cache to one repository.

For an explicit non-interactive full data cleanup followed by installation:

```bash
bash .container/clean.sh --scope data --prune --yes --install billing
```

This permanently deletes the Platform master database, tenant databases,
Redis state, uploaded Media, File Browser metadata, application storage, and
database backups stored in the named CODEXSUN volumes. It preserves local
`.env` and `.container/deploy.env`.

Docker does not expose reliable per-project ownership for BuildKit cache. To
also remove all unused local Docker build cache, including cache from other
projects, explicitly add:

```bash
bash .container/clean.sh --scope data --yes --prune --install billing
```

Without `--yes`, the helper requires the exact confirmation
`CLEAN_CXAPP`. It refuses to remove a network or volume whose configured
name is outside the `cxapp` namespace.

For a deliberately host-wide reset that removes every Docker container, custom
network, volume, image, and build cache before reinstalling CODEXSUN, use:

```bash
bash .container/clean.sh --yes --all-docker --install billing
```

Without `--yes`, host-wide cleanup requires `CLEAN_ALL_DOCKER`. Use
`--all-docker` only on a Docker host where every local Docker resource is
intended to be destroyed.

## Updating an existing Docker deployment

After pulling or copying the updated repository source, validate the existing
deployment without rebuilding anything:

```bash
bash update.sh --check
```

Apply the update interactively:

```bash
bash update.sh
```

For a non-interactive deployment host:

```bash
bash update.sh --yes
```

The updater refuses a dirty Git worktree by default. For an intentional emergency build from
uncommitted source, make the exception explicit so it is captured in deployment metadata:

```bash
bash update.sh --allow-dirty
```

On Windows with Git Bash:

```powershell
& "C:\Program Files\Git\bin\bash.exe" update.sh --check
```

The updater requires the existing `.container/deploy.env` and Compose-owned CODEXSUN containers.
It holds an exclusive host update lock; requires `package.json`, `CXAPP_VERSION`, and all three
application image tags to match; records the Git commit and dirty state; and checks free space in
both the backup filesystem and Docker storage before building. A dirty worktree is accepted only
with `--allow-dirty`. Applying an update requires the Linux `flock` command; read-only `--check`
does not acquire the update lock.

Before downtime, it validates configuration, container ownership, container health, and every
Compose model; builds the current API, Web, and migration images; and creates a timestamped full
MariaDB dump under `.container/backups/`. Every dump receives a verified SHA-256 sidecar. The
updater retains the newest `CXAPP_UPDATE_BACKUP_RETENTION` dumps and their deployment records.

Production migration is allowed only when `CXAPP_MIGRATION_COMPATIBLE_VERSION` exactly matches the
source version. Set that value only after confirming the release uses expand-contract migrations
that remain compatible with the currently running application image. The updater runs the database
migration preflight, applies forward migrations, recreates only `cxapp-api` and `cxapp-web`, waits
for Docker health, and runs the complete deployment smoke test. A failed replacement restores the
previous application images automatically; migrated data and the verified SQL backup are retained
for an operator-directed recovery.

Each attempt writes a permission-restricted JSON record beside its backup with the timestamp,
source commit, application version, dirty state, application image digests, migration result,
backup path, checksum, and final deployment status. Configure the minimum-space guards with
`CXAPP_UPDATE_MIN_BACKUP_FREE_MB` and `CXAPP_UPDATE_MIN_DOCKER_FREE_MB`.

The updater does not rerun interactive setup, modify either environment file, recreate MariaDB,
Redis, or File Browser, remove volumes, change credentials, pull source, or
touch unrelated containers.

## Development and registry release commands

The lower-level deployment command remains available for development and
immutable registry releases:

```bash
bash .container/deploy.sh billing up

# Build machine / CI: set CXAPP_IMAGE_REGISTRY in .container/deploy.env first.
bash .container/deploy.sh billing publish

# Deployment host
bash .container/deploy.sh billing upgrade
```

`upgrade` pulls the selected version, runs its safe forward migrations, and
recreates only that product's containers. It does not change either environment file, MariaDB,
Redis, Media, uploads, or named volumes. Increment the root workspace version
before publishing a new immutable release tag. Authenticate Docker to a private
registry before `publish` or `upgrade`.

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

Normal `setup`, `up`, and `upgrade` reuse those exact named volumes. MariaDB
application grants and the configured File Browser administrator are
reconciled from `.container/deploy.env`; Redis starts with the configured
password and its AOF volume. Changing a credential in the deployment file is
therefore an explicit rotation on
the next setup. No normal deployment action deletes a volume or database.

Before a production database migration, set `CXAPP_VERIFIED_BACKUP_ID` to the verified backup run ID. For a confirmed empty first install, record a unique marker such as `initial-empty-database-YYYYMMDD`.

Media administration can be reconciled independently:

```bash
bash .container/setup-media.sh
```

Only the explicit `--reinstall --wipe-media` combination removes media data; the helper validates mounts and targets before doing so.

## Default host ports

All published ports bind to `127.0.0.1` unless `CXAPP_BIND_ADDRESS` is changed.

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
