# Foundation Blueprint

## Purpose

This document captures the pre-coding foundation decisions for CODEXSUN.

It is based on the current planning conversation and should be treated as the practical starting blueprint before implementation begins.

## Build Priority

CODEXSUN will first build the base framework, platform, core modules, design system UI, maintenance tools, deployment tools, and operational foundation.

Business patterns such as billing, CRM, garments, uPVC, POS, and offset printing will come after the foundation is stable.

Initial priority order:

1. Framework.
2. Platform.
3. Core.
4. Design system.
5. Maintenance and deployment tools.
6. Sync and migration tools.
7. CLI tools.
8. Business app patterns.

## Monorepo Direction

CODEXSUN will use a monorepo.

The monorepo must support multiple runnable apps where each app can run on its own port and container.

Example app pattern:

- Base + Framework + Platform + Core + Billing app in one runnable app.
- Base + Framework + Platform + Core + CRM app in one runnable app.

Each app can communicate with other apps through APIs, internal APIs, and events where required.

## Top-Level Workspace Shape

Recommended structure:

```text
apps/
  platform/
  billing/
  crm/
  cxsync/
  cxdeploy/

tools/
  cxcli/

packages/
  framework/
  platform/
  core/
  shared/
  config/

assist/
```

## Monorepo Tooling

CODEXSUN will use npm for package management.

Workspace and task tooling:

```text
Package manager: npm
Workspace system: npm workspaces
Task orchestration: Turborepo
Local multi-process runner: concurrently where useful
```

Reason:

- npm is the selected package manager.
- npm workspaces provide native monorepo package linking.
- Turborepo provides fast task orchestration, caching, and clear pipelines without adding too much framework weight.
- concurrently can be used for simple local development commands that need multiple long-running processes in one terminal.

## Turborepo And concurrently Usage

Turborepo and concurrently solve different problems.

Use Turborepo for monorepo task orchestration:

- Build all packages.
- Test affected packages.
- Lint packages.
- Typecheck packages.
- Cache repeatable work.
- Run package-level pipelines.

Use concurrently for local developer convenience:

- Start API and web together for one app.
- Start app, worker, and watcher together.
- Start a small local stack from one npm script.

Rule:

- Turborepo is the main monorepo task runner.
- concurrently is allowed inside app-level `dev` scripts when it makes local development easier.
- Do not use concurrently as the main build or CI orchestration system.

## App Folder Pattern

Each runnable app should contain its frontend, backend, worker, and deployment assets inside the same app folder.

Example:

```text
apps/billing/
  api/
  web/
  worker/
  docker/

  worker/
  docker/

apps/crm/
  api/
  web/
  worker/
  docker/
```

This keeps each app deployable as its own unit while still sharing common packages.

## Framework

Framework is the technical backbone of CODEXSUN.

Framework provides the skeleton, app entry points, and technical conventions.

Framework should enforce technical structure only. It should not enforce business rules.

Framework responsibilities:

- App bootstrap.
- Config loading.
- Environment handling.
- API server setup.
- Routing convention.
- Module registration convention.
- Logging.
- Error handling.
- Database connection contracts.
- Event contracts.
- Queue contracts.
- HTTP utilities.
- Standard API response shape.
- Runtime health checks.

## Backend Framework

Backend APIs will use Fastify.

Fastify should be used through Framework conventions so every app gets the same technical structure.

Fastify responsibilities through Framework:

- API app bootstrap.
- Route registration.
- Plugin registration.
- Request lifecycle hooks.
- Error handling.
- Validation integration.
- Auth hook integration.
- Health checks.
- Structured logging.

Business rules should not be hidden inside generic Fastify plugins. Platform and Core modules own business behavior.

## API Response Envelope

All CODEXSUN APIs should return a standard response envelope.

Success response:

```json
{
  "success": true,
  "data": {},
  "meta": {
    "requestId": "req_123",
    "timestamp": "2026-06-28T10:00:00Z"
  }
}
```

Error response:

```json
{
  "success": false,
  "error": {
    "code": "TENANT_NOT_FOUND",
    "message": "Tenant not found",
    "details": {}
  },
  "meta": {
    "requestId": "req_123",
    "timestamp": "2026-06-28T10:00:00Z"
  }
}
```

Rules:

- `success` must clearly indicate result state.
- `data` is present for successful responses.
- `error` is present for failed responses.
- `meta.requestId` is required.
- `meta.timestamp` is required.
- Error codes should be stable and machine-readable.
- Error messages should be user-safe.
- Internal details must not leak to clients.
- Validation errors should use structured field details.
- Pagination, sorting, and filtering metadata should live in `meta` where needed.

## Validation Strategy

CODEXSUN will use Zod for validation at system boundaries.

Decision:

```text
Validation library: Zod
Usage: boundaries first
```

Use Zod for:

- API request validation.
- API response contracts where useful.
- Form validation.
- Environment config validation.
- Event payload validation.
- Queue job payload validation.
- CLI input validation.
- Integration webhook payload validation.

Rules:

- Validate external input before it reaches application services.
- Keep validation errors structured and field-specific.
- Do not duplicate validation rules in multiple places when shared schemas are practical.
- Domain rules should still live in domain/application layers when they require business meaning.
- Zod schemas can live in module `contracts/` when shared across backend and frontend.

## Shared API Contracts

Backend modules should expose typed contracts from their `contracts/` folder.

Example:

```text
packages/platform/src/tenant/contracts/
  tenant.schemas.ts
  tenant.types.ts
  tenant.api.ts
```

Shared contracts can be used by:

- API request validation.
- API response typing.
- Frontend forms.
- TanStack Query hooks.
- Tests.
- CODEIT understanding.
- CLI commands.
- Integration adapters where appropriate.

Rules:

- Public module contracts belong in `contracts/`.
- Zod schemas should be shared where practical.
- Internal database models should not be exposed as public contracts.
- API contracts should be stable and version-aware when used outside one app.
- Frontend should depend on contracts, not backend infrastructure.
- Contract changes that break consumers must be documented.

## Shared API Client

CODEXSUN will use a shared API client package.

Decision:

```text
API client package: @codexsun/api-client
```

Used by:

- Platform web.
- Billing web.
- CRM web.
- Electron desktop app.
- React Native mobile app.
- cxcli where useful.
- Internal tools where appropriate.

Responsibilities:

- Handle standard response envelope.
- Normalize errors.
- Support secure cookie session calls for web.
- Support access token and refresh token flow for desktop and mobile.
- Attach request IDs where needed.
- Attach tenant context where needed.
- Support typed calls using shared contracts.
- Provide TanStack Query helpers where useful.
- Handle retries only where safe.

Rules:

- `@codexsun/api-client` should not own business rules.
- It should not bypass auth, tenant, permission, or activation checks.
- It should expose clear error objects for UI and CLI.
- It should support app-specific base URLs.
- It should support internal and public API modes only through explicit configuration.

## Tenant Context Resolution

CODEXSUN will use a hybrid tenant context strategy.

Decision:

```text
Tenant context: hybrid
Primary web resolution: domain or subdomain
Dev and Super Admin fallback: host, path, or explicit selection
Explicit API calls: tenant header after resolution
Jobs/events: tenant ID in payload metadata
```

Supported tenant resolution methods:

- Custom domain, such as `customerbusiness.com`.
- Subdomain, such as `acme.codexsun.com`.
- Path fallback, such as `codexsun.com/t/acme`, only for development, internal tools, or Super Admin use.
- Header, such as `X-Tenant-ID` or `X-Tenant-Slug`.

Rules:

- Production tenant desk should primarily resolve tenant from custom domain or subdomain.
- Path-based tenant access is for local development, internal tools, and Super Admin support flows.
- API client can send tenant header after tenant is resolved.
- Desktop and mobile should send explicit tenant context after login or tenant selection.
- Internal APIs should send tenant ID explicitly.
- Queue jobs must include tenant ID.
- Domain events must include tenant ID.
- Logs and traces should include tenant context where safe.
- Tenant header must not be blindly trusted without validation.
- Super Admin and Staff desks must avoid accidental tenant context confusion.

## Tenant Domain Mapping

CODEXSUN should include tenant domain mapping.

Decision:

```text
Application owns: domain-to-tenant mapping
Infrastructure owns: SSL/certificates, reverse proxy, DNS, Cloudflare, Nginx
```

Application responsibilities:

- Store tenant domain records.
- Store tenant subdomain records.
- Resolve incoming host to tenant.
- Track active/inactive domain mapping status.
- Prevent one domain from mapping to multiple tenants.
- Audit domain mapping changes.
- Allow Super Admin or authorized staff to manage mappings.

Infrastructure responsibilities:

- SSL certificate management.
- TLS termination.
- Reverse proxy routing.
- DNS setup.
- Cloudflare configuration.
- Nginx configuration.

Rules:

- App logic should not depend on certificate implementation.
- Platform should not try to become the SSL certificate authority.
- cxdeploy may help configure or inspect infrastructure, but tenant resolution inside the app only needs domain mapping.

## Database Query Layer

CODEXSUN will use Kysely for database access.

Reason:

- Type-safe SQL query builder.
- Flexible for tenant database routing.
- Less ORM magic.
- Strong control for enterprise data design.
- Better transparency for accounting, billing, reports, migrations, and performance tuning.

Kysely should be wrapped by Framework database contracts and used by Platform, Core, and app modules through clear data access boundaries.

Database decisions:

```text
Database: MariaDB
Query layer: Kysely
Backend framework: Fastify
```

## Frontend Framework

Web apps will use Vite + React.

Decision:

```text
Frontend framework: Vite + React
Frontend router: TanStack Router
```

Reason:

- Fast local development.
- Simple deployment for authenticated SaaS dashboards.
- Clean separation from the Fastify backend.
- Less framework overlap than using a full-stack web framework.
- Good fit for Platform, billing, CRM, cxsync, and cxdeploy dashboards.
- Type-safe route structure through TanStack Router.
- Strong fit with TanStack Query and TanStack Table.

Frontend apps should still follow shared Platform design system, routing, auth guard, data fetching, table, form, and layout standards.

TanStack Router should be used for:

- Platform `/sa` routes.
- Platform `/admin` routes.
- Platform tenant `/` routes.
- Business app route groups.
- Auth-guarded layouts.
- Permission-aware route loaders.
- Typed route parameters.
- Search and filter state where useful.

## UI Framework And Design System

CODEXSUN will have its own UI package.

Decision:

```text
UI package: @codexsun/ui
Base styling: Tailwind CSS
Component foundation: shadcn/ui style patterns
Design inspiration: Mantine UI styling and ergonomics
Rule: build CODEXSUN's own UI framework, do not make Mantine the application framework
```

`@codexsun/ui` should provide shared UI primitives, business components, layout components, form components, table components, app shell elements, feedback components, and design tokens.

The package should be used by:

- Platform app.
- Billing app.
- CRM app.
- cxsync dashboard.
- cxdeploy dashboard.
- Future business apps.

Recommended UI areas:

```text
@codexsun/ui/tokens
@codexsun/ui/theme
@codexsun/ui/primitives
@codexsun/ui/forms
@codexsun/ui/tables
@codexsun/ui/layouts
@codexsun/ui/navigation
@codexsun/ui/feedback
@codexsun/ui/overlays
@codexsun/ui/business
```

Platform can still own platform-specific screens and logic, but reusable visual components belong in `@codexsun/ui`.

## Migration Strategy

CODEXSUN will start with Umzug + Kysely for migrations.

Migrations will be wrapped and operated through cxsync.

Decision:

```text
Migration runner: Umzug
Migration SQL/query layer: Kysely
Migration owner app: cxsync
Future direction: evolve into a stronger cxsync migration engine
```

Reason:

- Umzug gives flexible migration execution and tracking.
- Kysely keeps migrations close to the selected database access layer.
- cxsync owns tenant database upgrades, version tracking, retries, repair, and data mirroring.
- This avoids building a heavy custom migration engine too early while keeping the architecture ready for enterprise tenant upgrades.

Migration responsibilities:

- Platform requests tenant provisioning.
- cxdeploy creates the tenant database.
- cxsync runs Umzug + Kysely migrations.
- cxsync records tenant schema version.
- cxsync reports success or failure back to Platform.
- cxsync later evolves custom controls for retries, repair, multi-tenant rollout, and migration observability.

Business rules such as tenant behavior, permissions, activation, audit, and shared business records belong in Platform or Core.

## Logging Standard

CODEXSUN will use structured JSON logs with request and correlation tracking.

Decision:

```text
Logging format: structured JSON
Required tracking: requestId and correlationId where applicable
```

Recommended log fields:

```text
timestamp
level
environment
requestId
correlationId
tenantId
userId
userType
app
module
action
message
errorCode
durationMs
```

Rules:

- Every API request should have a request ID.
- Related events and jobs should carry correlation ID.
- Tenant ID should be logged where safe.
- User ID should be logged where safe.
- Secrets, tokens, passwords, and sensitive payloads must never be logged.
- Avoid unnecessary blob payloads or large raw objects in logs.
- Log references, IDs, summaries, and error metadata instead of full heavy payloads.
- Logs should be readable by support and useful for observability.
- cxsync and cxdeploy must follow the same logging standard.

## Queue Backend Strategy

CODEXSUN will support switchable queue backends.

Decision:

```text
Cloud/default queue: BullMQ + Redis
Local/dev queue: database-backed queue
Queue selection: configurable through Super Admin/system settings
Framework: queue abstraction contract
```

Reason:

- BullMQ + Redis is strong for cloud workers, retries, delayed jobs, and scalable background processing.
- Database-backed queue is simpler for local development, offline-like testing, and small self-hosted/dev environments.
- A Framework queue abstraction keeps application modules independent from the selected queue backend.

Rules:

- App modules must use Framework queue contracts, not direct BullMQ or database queue APIs.
- Queue jobs must include tenant context where relevant.
- Queue jobs must include correlation ID.
- Queue backend selection must be explicit and visible in Super Admin settings.
- Changing queue backend in production is a high-risk system setting and requires Super Admin approval.
- Failed jobs must be visible to support.
- Queue payloads should avoid unnecessary large blobs.
- Store large files or heavy payloads separately and pass references in jobs.

Initial queue backends:

- `bullmq-redis`
- `database`

Queue use cases:

- Mail and notifications.
- Integration calls.
- e-Invoice and e-Way bill work.
- Reports.
- Data imports and exports.
- Sync and migration tasks.
- AI background analysis.
- Maintenance jobs.

## Event System Strategy

CODEXSUN will start with a database outbox plus queue dispatcher event strategy.

Decision:

```text
Event persistence: database outbox
Event dispatch: queue dispatcher
Local/dev: database outbox + database-backed queue
Cloud/default: database outbox + BullMQ/Redis dispatcher
Future enterprise: broker adapter if needed
```

Reason:

- Business events should not be lost when database transactions succeed.
- Outbox records can be stored with the same transactional boundary as business changes.
- Dispatch can be retried by workers.
- Queue backend remains switchable.
- Future broker support can be added through adapters when scale requires it.

Rules:

- Important domain events must be written to an outbox.
- Outbox events must include tenant context where relevant.
- Outbox events must include event name, version, payload, occurred timestamp, and correlation ID.
- Dispatchers must be idempotent.
- Failed dispatch must be visible to support.
- Consumers must handle duplicate delivery safely.
- Events should avoid large payload blobs and use references when possible.
- Future Kafka, NATS, RabbitMQ, or other broker support should be added through Framework event contracts.

## File Storage Strategy

CODEXSUN will use a switchable storage adapter.

Decision:

```text
Storage strategy: switchable adapter
Development/local: local filesystem
Cloud: S3-compatible object storage
Self-hosted: MinIO supported
File browser: FileBrowser.org supported in a custom combined storage utility container
```

Storage should support mixed usage:

- Small local/dev files can use local filesystem.
- Invoice documents should use S3-compatible storage in cloud.
- Compliance documents should use durable object storage.
- Self-hosted deployments can use MinIO as S3-compatible storage.
- MinIO and FileBrowser.org should be available together through a custom storage utility container where useful.
- FileBrowser.org can be used for self-hosted or managed file browsing where appropriate.
- Cloud deployments may wire storage as volumes where the infrastructure design requires it.

Rules:

- Application modules must use Framework/Core storage contracts, not direct provider APIs.
- File metadata should be stored in the tenant database or appropriate module database.
- Large files should not be stored inside queue payloads, event payloads, or logs.
- Jobs and events should pass file references.
- Storage provider configuration must be tenant-aware when needed.
- Sensitive files need permission checks before access.
- Signed URLs or controlled download endpoints should be used where appropriate.
- Invoice and compliance documents must remain auditable.
- Storage backend changes in production are high-risk and require Super Admin approval.

Initial storage adapters:

- `local-filesystem`
- `s3-compatible`
- `minio`

## Local And Cloud Deployment Parity

CODEXSUN local testing and cloud deployment should follow the same strict rules as much as possible.

Decision:

```text
Local testing and cloud deployment should use matching container, service, migration, queue, storage, routing, and configuration rules.
```

Purpose:

- Catch deployment issues early.
- Keep developer environments close to production.
- Reduce surprises during release.
- Make cxdeploy and cxsync behavior predictable.

Rules:

- Local should use Docker-based services when practical.
- Cloud should use the same service boundaries as local.
- Environment variables must follow the same names and validation rules.
- Database migrations must run through the same cxsync path.
- Tenant provisioning should use the same Platform -> cxdeploy -> cxsync flow.
- Queue abstraction should be the same even if backend differs.
- Storage abstraction should be the same even if provider differs.
- API routing and tenant resolution rules should be tested locally.
- Health checks should exist locally and in cloud.
- Logs should use the same structured format locally and in cloud.
- Local shortcuts are allowed only when documented and not hidden inside business logic.

Expected local service stack:

```text
mariadb
redis
storage-utils
platform-api
platform-web
cxsync
cxdeploy
selected business apps
```

`storage-utils` is a custom container that can bundle MinIO and FileBrowser.org together for local, self-hosted, or managed storage utility scenarios.

## Environment Configuration

CODEXSUN will use one `.env` file per running environment to avoid confusion.

Decision:

```text
Environment file: .env
Example file: .env.example
Validation: Zod
Secrets: never committed
```

Rules:

- Each environment should have one active `.env` file.
- `.env.example` documents required variables without secrets.
- Environment variables must be validated at startup with Zod.
- Missing or invalid required variables should fail fast.
- Secrets must not be committed to source control.
- Environment names and variable names should stay consistent across local and cloud.
- Avoid multiple competing files such as `.env.local`, `.env.development`, `.env.staging`, and `.env.production` unless a future operational need is approved.

## TypeScript Standard

CODEXSUN will use strict TypeScript from day one.

Decision:

```json
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "exactOptionalPropertyTypes": true
}
```

Rules:

- Avoid `any` unless there is a documented reason.
- Prefer explicit domain and contract types.
- Shared packages must be type-safe.
- API contracts should be typed.
- Database query results should be typed through Kysely.
- Strict mode should apply across apps, packages, tools, and shared code.

## Formatting And Linting

CODEXSUN will use ESLint, Prettier, and Knip.

Decision:

```text
Linting: ESLint
Formatting: Prettier
Unused dependency/export checks: Knip
```

Rules:

- ESLint enforces code quality rules.
- Prettier handles formatting.
- Knip detects unused dependencies, files, and exports.
- Turborepo should run lint, format check, typecheck, and Knip checks through standard tasks.
- Formatting should be consistent across apps, packages, tools, and generated starter files.
- CI should fail on lint, format, type, or Knip violations once the foundation is active.

## Testing Tools

CODEXSUN will use Vitest, Testing Library, and Playwright for focused test coverage.

Decision:

```text
Unit tests: Vitest
API tests: Vitest + Fastify inject
Frontend component tests: Vitest + Testing Library
E2E tests: Playwright
```

Rules:

- Unit tests should cover domain logic, permissions, activation rules, validation helpers, and pure service behavior.
- API tests should use Fastify inject where possible for fast request-level testing.
- API tests must cover auth, tenant context, permissions, activation, validation, and error envelopes.
- Frontend component tests should focus on shared UI, important forms, tables, and interaction states.
- Playwright should cover critical browser workflows across Platform desks and business apps.
- E2E tests should focus on critical flows rather than every small UI detail.
- Test data should be tenant-aware.
- High-risk billing, accounting, compliance, sync, and activation flows need regression coverage.

Production may use managed services, but application behavior and contracts should remain the same.

## Framework Package Pattern

Framework will be one package with subpath modules.

Package:

```text
@codexsun/framework
```

Subpath examples:

```text
@codexsun/framework/api
@codexsun/framework/config
@codexsun/framework/db
@codexsun/framework/logger
@codexsun/framework/errors
@codexsun/framework/modules
@codexsun/framework/events
@codexsun/framework/queue
@codexsun/framework/http
@codexsun/framework/env
```

## Platform

Platform is the shared product foundation used by all apps.

Platform owns tenant, identity, subscription, activation, settings, audit, notifications, and design system capabilities.

Platform package:

```text
@codexsun/platform
```

Platform subpaths:

```text
@codexsun/platform/tenant
@codexsun/platform/auth
@codexsun/platform/users
@codexsun/platform/roles
@codexsun/platform/permissions
@codexsun/platform/subscription
@codexsun/platform/activation
@codexsun/platform/audit
@codexsun/platform/notifications
@codexsun/platform/settings
@codexsun/platform/design-system
```

Platform enforces shared platform business rules.

## Core

Core contains business-common modules needed across business apps.

Core package:

```text
@codexsun/core
```

Core follows the same single-package subpath pattern.

Expected Core subpaths:

```text
@codexsun/core/company
@codexsun/core/contacts
@codexsun/core/products
@codexsun/core/address
@codexsun/core/location
@codexsun/core/files
@codexsun/core/tags
@codexsun/core/notes
```

Core is business-common. Billing, CRM, and future business apps can depend on Core modules.

## Package Pattern Rule

All remaining shared areas should follow the same pattern:

- One package for the area.
- Subpath modules inside the package.
- Clear module boundaries inside the package.
- Public exports for each subpath.

Avoid creating too many small packages too early.

## Standard Module Folder Structure

Every Platform, Core, and business app module should follow this DDD-style folder structure.

Example:

```text
packages/platform/src/tenant/
  domain/
  application/
  infrastructure/
  interface/
  contracts/
  events/
  migrations/
  tests/
```

Folder meaning:

- `domain/`: entities, value objects, domain services, and business rules.
- `application/`: use cases, commands, queries, orchestration, and application services.
- `infrastructure/`: database access, external services, queues, providers, and adapters.
- `interface/`: API routes, route handlers, controllers, UI adapters, and event/job handlers.
- `contracts/`: public types, DTOs, schemas, and module contracts.
- `events/`: published events, consumed events, event payloads, and event handlers.
- `migrations/`: module database migrations and seed changes.
- `tests/`: module unit, integration, and contract tests.

Rules:

- Business rules belong in `domain/` or `application/`.
- Database implementation belongs in `infrastructure/`.
- API route handlers belong in `interface/`.
- Cross-module public contracts belong in `contracts/`.
- Events must be documented in `events/`.
- Module migrations must stay with the owning module.
- Tests should stay near the module they protect.

## Platform App

Platform will also have its own runnable app.

Structure:

```text
apps/platform/
  api/
  web/
  worker/
  docker/
```

The Platform app manages platform-level and tenant-level operations.

## Three Desk Model

The Platform web app will contain three desks with separate route groups, layouts, logins, and auth guards.

```text
apps/platform/web/
  /sa
  /admin
  /
```

## Super Admin Desk

Route:

```text
/sa
```

Purpose:

- Owner and founder control.
- Full platform monitoring.
- Tenant control.
- System activity monitoring.
- Deployment visibility.
- Platform operations.
- High-level control for trusted operators.

Auth user type:

```text
SuperAdminUser
```

Super Admin Desk should have its own login system, layout, route guard, menu, permissions, and session rules.

## Admin Desk

Route:

```text
/admin
```

Purpose:

- Internal staff workspace.
- Support tickets.
- Bug handling.
- Customer onboarding.
- Marketing operations.
- Tenant support.
- Staff activity.

Auth user type:

```text
StaffUser
```

Admin Desk should have its own login system, layout, route guard, menu, permissions, and session rules.

## Tenant Desk

Route:

```text
/
```

Purpose:

- Normal customer-facing tenant workspace.
- Tenant users.
- Tenant operations.
- Tenant settings where permitted.
- Activated apps and modules.

Auth user type:

```text
TenantUser
```

Tenant Desk should have its own login system, layout, route guard, menu, permissions, and session rules.

## Identity Separation

The three desks will use separate user types and separate auth guards.

User types:

- `/sa` uses `SuperAdminUser`.
- `/admin` uses `StaffUser`.
- `/` uses `TenantUser`.

They may share framework auth utilities, UI components, password policy utilities, and security primitives, but their identity models and permission boundaries are separate.

## Auth And Session Strategy

CODEXSUN will use a hybrid auth strategy.

Decision:

```text
Web desks: secure HTTP-only cookie sessions
Desktop app: access token + refresh token
Mobile app: access token + refresh token
```

Web desks:

- `/sa` Super Admin Desk uses secure HTTP-only cookies.
- `/admin` Admin Desk uses secure HTTP-only cookies.
- `/` Tenant Desk uses secure HTTP-only cookies.
- Each desk has its own auth guard, session scope, and user type.

Desktop and mobile:

- Electron uses access token + refresh token.
- React Native with Expo uses access token + refresh token.
- Refresh token rotation should be planned.
- Device identity should be tracked.

Auth rules:

- Tokens and sessions must be scoped by user type.
- Tenant user sessions must include tenant context.
- Super admin and staff sessions must not behave like tenant user sessions.
- Logout should revoke the active session or refresh token.
- Sensitive auth events must be audited.
- Cross-desk session confusion must be avoided.

## MFA Policy

CODEXSUN will require stronger authentication for sensitive desks.

Decision:

```text
/sa: MFA required
/admin: MFA required
/: MFA optional and tenant-configurable
```

Rules:

- Super Admin users must use MFA.
- Staff users must use MFA.
- Tenant users can use MFA if enabled by tenant policy or user preference.
- Tenant-level MFA can later become required for selected enterprise tenants.
- MFA enrollment, reset, disable, and recovery must be audited.
- Emergency MFA bypass requires high-level approval and audit.

## Permission Naming Pattern

CODEXSUN permissions will use this pattern:

```text
scope.module.resource.action
```

Examples:

```text
platform.tenant.profile.view
platform.tenant.profile.update
platform.subscription.plan.manage
platform.audit.activity.view
core.contacts.customer.create
core.contacts.customer.update
core.products.item.view
core.products.item.update
billing.invoice.create
billing.invoice.cancel
billing.payment.receive
crm.lead.assign
inventory.stock.adjust
```

Permission parts:

- `scope`: platform, core, billing, crm, cxsync, cxdeploy, or another app/module area.
- `module`: functional module inside the scope.
- `resource`: business object or capability.
- `action`: view, create, update, delete, manage, approve, cancel, export, import, assign, sync, repair, or another clear action.

Rules:

- Permission names must be lowercase.
- Use dots as separators.
- Avoid vague actions like `do` or `process`.
- Use `manage` only when the permission truly includes many actions.
- Sensitive actions should have specific permissions.
- Permissions must be documented by the owning module.

## Role Model

CODEXSUN will support system roles plus dynamic custom roles.

Decision:

```text
Role model: system roles + custom roles
Custom roles: dynamic
```

System roles provide safe defaults. Custom roles let tenants and platform operators adapt permissions to real workflows.

### Tenant Desk Roles

Initial tenant system roles:

- Owner.
- Admin.
- Manager.
- Accountant.
- Staff.
- Viewer.

Tenants can create custom roles based on enabled modules and allowed permissions.

### Admin Desk Roles

Initial staff system roles:

- Support.
- Support Manager.
- Marketing.
- Operations.
- Developer.
- Admin.

Staff custom roles can be created for internal team workflows.

### Super Admin Desk Roles

Initial super admin roles:

- Super Admin.
- System Operator if needed.

Super Admin roles should remain very restricted and carefully audited.

### Role Rules

- System roles are created by CODEXSUN.
- Custom roles are created by authorized users.
- Roles map to permission sets.
- Permission changes must be audited.
- Role changes for `/sa` and `/admin` require MFA-confirmed sessions.
- Tenant custom roles cannot grant permissions outside the tenant's activated modules.
- Staff custom roles cannot grant super admin permissions.
- Super admin permissions must not leak into staff or tenant desks.

## Activation Model

CODEXSUN will use layered app, module, feature, and limit activation.

Decision:

```text
Tenant subscription enables app
App enables modules
Module enables features
Feature enables actions, limits, and provider configuration
```

Example:

```text
Tenant has Billing app
Billing app has Invoice module
Invoice module has e-Invoice feature
e-Invoice feature has monthly limit or provider config
```

Activation levels:

- Tenant subscription.
- App activation.
- Module activation.
- Feature activation.
- Feature limits.
- Provider configuration.
- Runtime settings.

Rules:

- Disabled apps should not appear in tenant navigation.
- Disabled modules should block APIs, routes, jobs, and actions.
- Disabled features should hide UI actions and block backend use.
- Limits must be enforced server-side.
- Provider config must be tenant-scoped.
- Activation changes must be audited.
- Runtime activation changes should not require full redeploy.
- Role permissions cannot bypass activation checks.

## Activation Change Control

Some activation changes can apply immediately. Sensitive changes require confirmation, scheduling, and Super Admin approval.

Decision:

```text
Normal activation changes: immediate when safe
Sensitive activation changes: confirmation or scheduled change
High-risk activation changes: Super Admin approval required
```

Sensitive or high-risk changes include:

- Disabling billing app.
- Disabling accounting app.
- Disabling compliance features.
- Disabling e-Invoice or e-Way bill.
- Reducing usage limits.
- Removing a module that has existing business records.
- Disabling offline sync.
- Disabling integrations used in active workflows.
- Changing provider configuration for compliance services.

Rules:

- High-risk changes require Super Admin approval.
- Tenant-facing changes should clearly show impact before confirmation.
- Scheduled changes should have effective date and time.
- Reducing limits should normally apply from the next billing cycle unless approved otherwise.
- Existing compliance and financial records must remain accessible after feature disablement.
- Activation change history must be audited.
- Failed activation changes must be recoverable.

## Database Strategy

Master database:

```text
cxsun_master_db
```

Tenant databases:

```text
tenant_acme_001_db
tenant_garments_002_db
tenant_pos_003_db
```

Each tenant gets a dedicated database.

## Master Database Responsibilities

The master database should contain platform-level data.

Expected data:

- Super admin users.
- Staff users.
- Tenant registry.
- Tenant database registry.
- Tenant provisioning status.
- Subscriptions.
- Activation records.
- Platform support tickets.
- Platform audit.
- Deployment metadata.
- Global feature catalog.
- Staff operations data.

## Tenant Database Responsibilities

Each tenant database should contain tenant-specific data.

Expected data:

- Tenant users.
- Tenant roles.
- Tenant permissions.
- Tenant settings.
- Core business data.
- Activated app data.
- Tenant audit.
- Tenant files metadata.
- Tenant notifications.
- Offline sync metadata.

## Tenant Provisioning Responsibility Split

Tenant provisioning is split across Platform, cxdeploy, and cxsync.

### Platform

Platform owns the business decision.

Responsibilities:

- Tenant creation request.
- Tenant name and identity.
- Plan selection.
- App activation request.
- Tenant owner user.
- Industry selection if needed.
- Provisioning status tracking.

### cxdeploy

cxdeploy owns infrastructure provisioning and maintenance.

Responsibilities:

- Create tenant database.
- Create or update containers where needed.
- Apply infrastructure configuration.
- Repair deployment issues.
- System update support.
- Cloud maintenance.
- Container maintenance.

### cxsync

cxsync owns schema, upgrades, sync, and mirroring.

Responsibilities:

- Apply tenant database migrations.
- Apply seed data.
- Maintain schema versions.
- Handle data upgrades.
- Support online/offline sync.
- Support data mirroring.
- Track sync and migration status.

## Tenant Provisioning Flow

Preferred flow:

```text
Platform: create tenant request
Platform: emit tenant.provisioning.requested
cxdeploy: create tenant database and infrastructure
cxdeploy: emit tenant.database.created
cxsync: apply migrations and seed data
cxsync: emit tenant.schema.ready
Platform: activate tenant and apps
Platform: tenant becomes usable
```

## Internal Communication

Platform, cxdeploy, and cxsync should communicate through internal APIs and events.

Initial event examples:

```text
tenant.provisioning.requested
tenant.database.created
tenant.database.failed
tenant.schema.migration.started
tenant.schema.migration.completed
tenant.schema.migration.failed
tenant.schema.ready
tenant.activation.completed
```

Internal API calls should be authenticated, traceable, and environment-aware.

## cxsync

cxsync is a separate runnable app with its own port and container.

Purpose:

- Online/offline sync.
- Data migration.
- Upgradable tenant schemas.
- Data mirroring.
- Tenant database version control.
- Sync status and conflict tracking.

cxsync communicates with Platform and business apps through APIs and events.

## cxdeploy

cxdeploy is a separate runnable app with its own port and container.

Purpose:

- Container maintenance.
- Cloud maintenance.
- System update.
- Repair.
- Infrastructure provisioning.
- Tenant database provisioning.

cxdeploy should be treated as a sensitive operations app with strong access control and audit.

## cxcli

cxcli is a pure CLI app located under `tools/`.

Purpose:

- Development support.
- Production operations support.
- Tenant commands.
- Migration commands.
- App scaffolding.
- Diagnostics.
- Maintenance commands.

cxcli should call approved internal APIs or use approved local development commands. Production usage must be auditable.

## Open Blueprint Questions

The following areas still need decisions before coding:

- Tenant provisioning failure and rollback behavior.
- cxsync internal data model.
- cxdeploy safety model.
- cxcli command categories.
- Local development environment flow.
- First platform MVP milestone.
