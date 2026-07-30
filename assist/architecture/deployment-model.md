# Deployment Model

## Deployment Goal

CODEXSUN should support flexible deployment while keeping development simple.

The platform should run as a modular monolith by default, with container boundaries prepared for scaling and tenant-specific deployment needs.

Local testing and cloud deployment should follow the same strict rules and service boundaries wherever practical.

## Runtime Surfaces

- Web application.
- API server.
- Background workers.
- Queue processor.
- Scheduler.
- Desktop app through Electron.
- Mobile app through Expo.
- Tenant databases.
- File storage.
- Integration services.

## Multi-Port And Multi-Container Direction

Different runtime parts may run on different ports and containers:

- Frontend web app.
- Backend API.
- Worker service.
- Scheduler service.
- Tenant database containers.
- Local development services.
- Integration bridge services where needed.

## App Bundle Containers

CODEXSUN should support product bundles where each container/deployment includes its own backend, frontend, workers, and selected app packages while still sharing framework, platform, and UI packages from the same codebase.

Examples:

```text
billing-suite
  shared packages
  framework
  platform
  core
  billing

crm-suite
  shared packages
  framework
  platform
  core
  crm

```

Each bundle may eventually have its own API, Web, and Worker images:

```text
docker/
  billing/
    api.Dockerfile
    web.Dockerfile
    worker.Dockerfile

  crm/
    api.Dockerfile
    web.Dockerfile
    worker.Dockerfile

```

The source code remains app-owned and modular. Containers bind selected apps and shared packages together.

The executable local product stacks use the same composition contract:

```text
framework + platform + core + billing = billing stack
```

The executable container layout lives under `.container/`. MariaDB, Redis, and Media form one
persistent infrastructure layer alongside the independent Billing Compose project. A normal product upgrade pulls
versioned images, applies only Billing's forward migrations, and replaces only its application containers. It must
preserve the deployment input, credentials, named volumes, databases, and uploads.

Platform supplies identity, tenant, permission, activation, audit, queue, storage, and operational
services. Core supplies tenant-owned common masters through fixed public contracts. Billing remains
the owner of invoices and financial documents. A stack is a deployment composition, not a shared
business CRUD boundary.

### Development runtime boundary

The root development command owns only Platform API `7010` and Platform Web `7020`. Core, Billing,
Mail, Framework, and UI are npm workspace packages composed into those two processes. No product
package may introduce a standalone API or web listener.

Changing Framework, Platform, Core, or another public foundation contract is intentionally wider work:
`npm run stack:impact -- <changed files>` lists every product verification gate that must run. A change
to shared foundation code impacts all product stacks.

### Composed live releases

Workspace package versions remain lockstep for repository compatibility. Product changes preserve
their owned database and module boundaries, but deployment replaces the composed Platform API and
Platform Web services declared by `tools/product-stack-contract.mjs`. Use
`npm run stack:plan -- billing` to print the verification, database, rollout, and rollback boundary.

Production rollout must use an inactive/blue-green slot or a rolling replacement with readiness and
health gates. Traffic moves only after the new Platform API and web are healthy. Rollback switches
traffic to the previous composed runtime release.
Product database migrations are restricted to the product-owned scope and use expand-contract:
backward-compatible additions deploy first, destructive contraction occurs only after the rollback
window. A migration requiring an immediate destructive change is not independently deployable.

Shared public contracts remain explicit between workspace packages. A breaking contract must update
the owner and all composed consumers in the same verified repository release.

## Root Dist Rule

Build output must use the root `dist/` folder as the packaging surface. App-local `dist/` folders should not be treated as final release artifacts.

Expected shape:

```text
dist/apps/platform/api
dist/apps/platform/web
dist/apps/core/api
dist/apps/billing/api
dist/apps/mail/api
dist/packages/framework
dist/packages/ui
```

Root build/dev workflows should clean app-local `.turbo` folders under `apps/` so package outputs and Docker build contexts stay predictable.

## Hosted Platform Runtime

The non-container hosted baseline serves `dist/apps/platform/web` as static files through nginx and runs one compiled
Platform API server under systemd. Production nginx must not proxy the web root to Vite, and hosted services must not
depend on `npm run dev` remaining attached to a shell.

Browser API traffic keeps the stable same-origin paths `/api/platform`, `/api/core`, and `/api/billing`, but nginx and
the Platform Vite proxy route every path to Platform API `7010`. Platform Web is the only browser runtime on `7020`.
Core and Billing retain route ownership inside their packages after composition.

Platform Web embeds `/api/platform` as its browser API base in development and production. It must never embed a
loopback or container-only API hostname in a cloud browser bundle. `PLATFORM_WEB_ORIGIN` defines the canonical CORS
origin for direct API clients. Wildcard CORS is prohibited because authenticated requests may carry credentials.

The public app portal is a safe tenant projection. Shared navigation, slider, features, updates, and footer components
are rendered by Platform, while tenant-specific content is stored under `tenants.payload_settings.appPortal`. The
exact app hostname must be registered through Tenant Domains; the canonical Platform hostname may resolve the
configured default tenant. A tenant's optional public URL is external content only. Authenticated dashboard Home
actions return to the Platform root on the current app origin.

The maintained baseline configuration and installation commands live under `deploy/hosted/`. The Platform API binds
to loopback behind nginx, restarts automatically after failures, and exposes its existing health endpoint through
`/api/platform/health`. The Platform web build reads client variables from the root `.env`; its dev-server port is not
a production-build requirement.

## Container Rules

- Containers should be replaceable and reproducible.
- Runtime configuration should come from environment variables or secure config.
- Secrets must not be stored in images.
- Logs should be structured.
- Health checks should be available.
- Workers and API should share the same domain contracts.
- Local and cloud containers should use matching contracts, health checks, environment names, and service responsibilities.

## Tenant Deployment Options

Possible tenant deployment models:

- Shared app containers with dedicated tenant database.
- Dedicated app and database containers for selected tenants.
- Hybrid local desktop plus cloud sync.
- On-premise private deployment if business requires it.

## Scaling Direction

Scale in this order:

1. Optimize module and database design.
2. Separate workers from API.
3. Scale read-heavy reporting separately.
4. Add dedicated containers for heavy modules.
5. Split services only when module boundaries are proven.
