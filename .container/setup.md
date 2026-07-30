# CODEXSUN Host Setup

Last updated: 2026-07-21

This document records the active deployment on `69.62.81.166`. Secrets and
passwords are intentionally omitted. Deployment credentials are stored only in
the ignored `.container/deploy.env` file with mode `0600`; root `.env` remains
development-only.

## Repository and runtime

- Repository path: `/home/cxapp`
- Branch: `main`
- Docker network: `cxapp-network`
- Runtime versions: Node.js `26.5.0` and npm `12.0.1` inside the application images
- Deployment command: `bash setup.sh`
- Update readiness check: `bash update.sh --check`
- Guarded source update: `bash update.sh`

The complete stack is deployed with persistent Docker volumes. MariaDB, Redis,
FileBrowser, Platform API, and Platform Web use restart policies and health
checks. Platform API and Web compose Core, Billing, and Mail into the shared
runtime.

## Containers and host ports

| Service      | Container          | Host binding      |
| ------------ | ------------------ | ----------------- |
| MariaDB      | `cxapp-mariadb` | `127.0.0.1:3307`  |
| Redis        | `cxapp-redis`   | `127.0.0.1:6379`  |
| Platform API | `cxapp-api`        | `127.0.0.1:17010` |
| Platform Web | `cxapp-web`        | `127.0.0.1:17020` |
| FileBrowser  | `cxapp-media`   | `127.0.0.1:7090`  |

Traefik runs separately from `/docker/traefik`, listens on public ports 80 and
443, redirects HTTP to HTTPS, and obtains certificates with the `letsencrypt`
resolver.

## Public HTTPS routes

- `https://app.codexsun.com` - canonical Platform Web address
- `https://www.codexsun.com` - optional marketing-domain redirect
- `https://files.codexsun.com` - FileBrowser

The canonical hostname routes through Traefik to the Platform Web container and
resolves the default CODEXSUN tenant. Additional tenant hostnames are not part
of this single-tenant deployment.

## Databases and tenants

The MariaDB application user is `root`; its password is stored only in the
protected environment files. The master database is `cxapp_master_db`.

| Tenant code | Primary domain     | Database      | Status |
| ----------- | ------------------ | ------------- | ------ |
| `CODEXSUN`  | `app.codexsun.com` | `cxapp_db` | Active |

The tenant database is provisioned with the repository-supported tenant
workflow and seeded idempotently with Platform Application, Core/Billing, Mail,
roles, permissions, module settings, migrations, and isolated storage paths.
The seed command is:

```bash
docker compose --env-file .container/deploy.env \
  -f .container/billing/docker-compose.yml --profile tools \
  run --rm platform-migrate npm run db:seed
```

## Bootstrap accounts

- Platform super administrator: `sundar@sundar.com`
- Default CODEXSUN tenant administrator: `admin@tenant.com`
- FileBrowser administrator: `admin`

Passwords are not recorded here. Change all bootstrap passwords after initial
sign-in and keep the environment files private.

## Firewall and MariaDB

UFW is enabled with default incoming traffic denied. The explicit incoming
rule required by this deployment is:

- TCP 22 for OpenSSH

MariaDB is published on loopback only. Do not expose TCP 3307 publicly. For
production, replace the bootstrap `root` application account with a dedicated
least-privilege database user after tenant database lifecycle grants have been
designed and verified.

## Verification

The deployment was verified with:

```bash
bash .container/smoke-test.sh
docker ps
ufw status verbose
```

Checks confirmed healthy containers, authenticated Redis, MariaDB connectivity,
master and tenant databases, seeded Billing and Mail modules, hostname-to-tenant
resolution, HTTPS certificates, redirects, and per-origin CORS responses.
