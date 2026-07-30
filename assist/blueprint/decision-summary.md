# Decision Summary

## Captured Decisions

### Foundation First

Build base framework, platform, core modules, design system UI, maintenance tools, deployment tools, sync tools, and CLI before business patterns.

### Monorepo

Use a monorepo that supports multiple runnable apps, ports, and containers.

Tooling:

- npm workspaces.
- Turborepo.
- concurrently for local multi-process development scripts where useful.

### Runnable Apps

Apps include:

- `platform`
- `billing`
- `crm`
- `cxsync`
- `cxdeploy`

### CLI Tool

`cxcli` lives under `tools/` because it is a CLI, not a port-based runtime app.

### App Folder Pattern

Each app contains:

- `api`
- `web`
- `worker`
- `docker`

### Framework

Framework is technical-only and does not enforce business rules.

Backend APIs use Fastify through Framework conventions.

Logging uses structured JSON with request ID and correlation ID, but avoids unnecessary blob payloads.

Queue backend strategy:

- BullMQ + Redis for cloud/default.
- Database-backed queue for local/dev.
- Switchable through Framework queue contracts and Super Admin/system settings.

Event strategy:

- Database outbox for persistence.
- Queue dispatcher for delivery.
- Broker adapters possible later.

Storage strategy:

- Switchable storage adapter.
- Local filesystem for development/local.
- S3-compatible storage for cloud.
- MinIO supported for self-hosted.
- MinIO and FileBrowser.org supported together through a custom storage utility container where useful.

Local testing and cloud deployment should follow the same strict rules and service boundaries as much as practical.

Environment configuration uses one active `.env` file plus `.env.example`, validated with Zod.

TypeScript uses strict mode from day one, including `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`.

Formatting and linting use ESLint, Prettier, and Knip.

Testing decisions:

- Unit tests use Vitest.
- E2E tests use Playwright.
- API tests use Vitest + Fastify inject.
- Frontend component tests use Vitest + Testing Library.

Database access uses Kysely with MariaDB.

Migration strategy uses Umzug + Kysely wrapped inside cxsync.

Web apps use Vite + React.

Frontend routing uses TanStack Router.

APIs use a standard response envelope with `success`, `data` or `error`, and `meta`.

Validation uses Zod at boundaries for APIs, forms, config, events, jobs, CLI input, and webhooks.

Modules expose shared typed API contracts from `contracts/` for backend, frontend, tests, CLI, and CODEIT understanding.

Shared API client package:

```text
@codexsun/api-client
```

Tenant context resolution is hybrid:

- Production tenant web resolves primarily from custom domain or subdomain.
- Path fallback is allowed for development, internal tools, and Super Admin support flows.
- API client can send tenant header after resolution.
- Jobs and events always carry tenant ID.

Tenant domain mapping is application-level. SSL/certs, DNS, Cloudflare, and Nginx are infrastructure responsibilities.

UI system lives in `@codexsun/ui`.

`@codexsun/ui` uses Tailwind CSS, shadcn/ui style patterns, and Mantine-inspired styling/ergonomics while remaining CODEXSUN's own UI framework.

### Platform

Platform owns shared platform business rules:

- Tenant.
- Auth.
- Users.
- Roles.
- Permissions.
- Subscription.
- Activation.
- Audit.
- Notifications.
- Settings.
- Design system.

### Core

Core owns business-common modules:

- Company.
- Contacts.
- Products.
- Address.
- Location.
- Files.
- Tags.
- Notes.

### Package Pattern

Use one package per major area with subpath modules.

Examples:

- `@codexsun/framework/api`
- `@codexsun/platform/tenant`
- `@codexsun/core/company`

Standard module folder structure:

```text
domain/
application/
infrastructure/
interface/
contracts/
events/
migrations/
tests/
```

### Platform Three Desk Model

Platform app has:

- `/sa` for Super Admin Desk.
- `/admin` for Staff Admin Desk.
- `/` for Tenant Desk.

### Auth Separation

Use separate auth guards and user types:

- `SuperAdminUser`
- `StaffUser`
- `TenantUser`

Auth/session strategy is hybrid:

- Web desks use secure HTTP-only cookie sessions.
- Desktop and mobile use access token + refresh token.

MFA policy:

- `/sa` MFA required.
- `/admin` MFA required.
- `/` tenant MFA optional and configurable.

Permission naming pattern:

```text
scope.module.resource.action
```

Role model:

- System roles plus dynamic custom roles.
- Tenant, staff, and super admin roles remain separated.

Activation model:

```text
Tenant subscription -> app -> module -> feature -> actions/limits/provider config
```

Sensitive activation changes require confirmation or scheduling. High-risk changes require Super Admin approval.

### Database Separation

Use:

- `cxsun_master_db`
- One dedicated database per tenant.

### Tenant Provisioning Split

Platform owns tenant business request.

cxdeploy owns infrastructure and tenant database creation.

cxsync owns migrations, upgrades, sync, and data mirroring.

### Provisioning Flow

```text
Platform request
cxdeploy database provisioning
cxsync migration and seed
Platform activation
Tenant usable
```
