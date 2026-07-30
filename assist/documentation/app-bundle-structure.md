# App Bundle Structure

## Purpose

CODEXSUN is developed as one codebase with many app bundles. Each business app should be owned separately in source code, while deployable containers can bind the required apps, shared packages, backend runtime, frontend runtime, and workers together.

This keeps Billing, CRM, and future apps independent enough to develop, test, package, and deploy separately without losing the shared platform foundation.

## Standard App Folder Shape

Use this structure for platform and business apps:

```text
apps/
  platform/
    api/              # Auth, tenant, RBAC, app registry, gateway/composition
    web/              # Main shell: login, SA desk, tenant desk, navigation

  core/
    api/              # Core API package; owned source is under api/src/modules
    web/              # Core frontend: common/master screens, lookups, reusable tenant data UI

  billing/
    api/              # Billing API package; owned source is under api/src/modules
    web/              # Billing frontend routes/screens/forms

  crm/
    src/              # CRM backend modules and thin package exports
    web/              # CRM frontend routes/screens/forms

```

## `api/src` Ownership

Runnable backend workspace packages use `apps/{app}/api`, and their owned source remains under
`apps/{app}/api/src`. The package name does not reduce the app to HTTP routes: domain rules,
application services, persistence, migrations, events, queues, workers, sync behavior, tests, and
interface adapters remain inside its module folders.

Correct:

```text
apps/billing/api/src
apps/billing/web
```

Special platform runtime:

```text
apps/platform/api
apps/platform/web
```

## Business App Source Root

Business app `api/src/` roots should stay flat and thin:

```text
apps/{app}/api/src/
  index.ts
  modules/
```

Do not add top-level `migrations/`, `queues/`, `seeders/`, `sync/`, `workers/`, `contracts/`, `domain/`, `application/`, `infrastructure/`, or `interface/` folders beside `modules/` under a business app `api/src/`.

Those concerns belong inside the owning module file:

```text
apps/{app}/api/src/modules/{module}/{module}.routes.ts
apps/{app}/api/src/modules/{module}/{module}.migration.ts
apps/{app}/api/src/modules/{module}/{module}.worker.ts
apps/{app}/api/src/modules/{module}/{module}.seed.ts
apps/{app}/api/src/modules/{module}/{module}.sync.ts
apps/{app}/api/src/modules/{module}/{module}.types.ts
```

If a package needs public subpath compatibility such as `@codexsun/billing/api` or `@codexsun/billing/migrations`, expose those package exports from the module index instead of recreating top-level source folders.

## Frontend Ownership

`apps/platform/web` is the shell and composer. It should own login, super-admin desk, admin desk, tenant desk layout, global navigation, app activation, and route composition.

Business UI belongs to the app that owns the business meaning:

```text
apps/core/web       # Common/master tenant UI
apps/billing/web    # Billing entries, billing settings, billing reports
apps/crm/web        # Leads, customers, pipeline, activities
```

Shared UI primitives stay in `packages/ui`. Do not move business rules or business-specific forms into `packages/ui`.

App web packages should export routes, menus, and screens that the platform shell can compose based on tenant activation and bundle configuration.

Business app web roots must mirror the backend module rule with a thin `pages/index.ts` and page-owned module folders:

```text
apps/{app}/web/pages/
  api.ts
  index.ts
  modules/
    {module}/
      index.ts
      {module}.list.tsx
      {module}.form.tsx
      {module}.workspace.tsx    # only when the module owns a full workflow shell
      {module}.services.ts
      {module}.hooks.ts
      {module}.types.ts
      {module}.schema.ts       # Zod schemas and validation contracts
      {module}.spec.ts         # Focused Playwright regression tests
      {module}.settings.tsx    # only when the module owns settings
      {module}.print.tsx       # only when the module owns print UI
apps/{app}/web/shared/
  index.ts
  {shared-area}/
    index.ts
```

Use `pages/modules/`, not `pages/tenant`, `features/`, or first-level module folders, for app-specific frontend workflows. Use `web/shared` only for cross-module app-web code such as shared entry workspace helpers. Keep reusable primitives, layout pieces, workspace controls, fields, tables, lookups, switches, dialogs, and visual building blocks in `packages/ui`; keep business-specific forms, lists, settings screens, print screens, and workflow composition in the owning app web package.

Frontend module API calls belong in `{module}.services.ts`, React Query/custom hooks belong in `{module}.hooks.ts`, Zod validation contracts belong in `{module}.schema.ts`, module interfaces/types belong in `{module}.types.ts`, and focused Playwright coverage belongs in `{module}.spec.ts`. Billing web has one shared `web/playwright.config.ts`; do not add per-module Playwright config files.

For Billing, the strict pairing is:

```text
apps/billing/api/src/modules/sales/
apps/billing/web/pages/modules/sales/
apps/billing/web/shared/
```

## Backend Ownership

Each business app backend owns its own business rules, tables, migrations, events, workers, and public contracts.

Examples:

- Billing owns quotations, sales, export sales, purchase, receipt, payment, billing document settings, and billing-specific compliance fields.
- Core owns contacts, companies, products, common modules, and shared tenant master records.
- Platform owns tenant identity, auth, roles, permissions, activation, subscription, audit, settings, files, notifications, and app registry behavior.

When one app needs another app to react, prefer contracts and events instead of direct cross-module table writes.

## Module File Pattern

Inside `apps/{app}/api/src/modules/{module}/`, use one folder with module-prefixed files. Do not create deep boundary folders for each concern.

Required pattern:

```text
apps/billing/api/src/modules/quotation/
  quotation.module.ts       # Module definition and registration
  quotation.service.ts      # Use cases and business operations
  quotation.repository.ts   # Database adapter
  quotation.routes.ts       # HTTP/interface layer
  quotation.events.ts       # Event names and handlers
  quotation.migration.ts    # Quotation-specific migrations
  quotation.worker.ts       # Background jobs and queue registration
  quotation.seed.ts         # Default data
  quotation.sync.ts         # Offline sync rules
  quotation.test.ts         # Tests
  quotation.types.ts        # Public types and contracts
  index.ts                  # Exports
```

Follow the same pattern for every module:

```text
apps/{app}/api/src/modules/{module}/{module}.module.ts
apps/{app}/api/src/modules/{module}/{module}.service.ts
apps/{app}/api/src/modules/{module}/{module}.repository.ts
apps/{app}/api/src/modules/{module}/{module}.routes.ts
apps/{app}/api/src/modules/{module}/{module}.events.ts
apps/{app}/api/src/modules/{module}/{module}.migration.ts
apps/{app}/api/src/modules/{module}/{module}.worker.ts
apps/{app}/api/src/modules/{module}/{module}.seed.ts
apps/{app}/api/src/modules/{module}/{module}.sync.ts
apps/{app}/api/src/modules/{module}/{module}.test.ts
apps/{app}/api/src/modules/{module}/{module}.types.ts
apps/{app}/api/src/modules/{module}/index.ts
```

This is strict for new modules and for module cleanup work. It keeps modules compact, readable, and close to the NestJS mental model without requiring NestJS itself.

## Bundle Model

Deployable bundles are product assemblies. A bundle decides which apps are included in that container or deployment.

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

The codebase is developed app-by-app. Containers bind the selected apps and shared packages together.

The root development stack contract is executable in `tools/product-stack-contract.mjs`:

```text
billing:    framework + platform + core + billing
```

Foundation APIs start in dependency order before the owned application API and web runtime. This
composition does not permit private imports or cross-app table writes.

## Docker Direction

Each product bundle may have its own backend, frontend, and worker container:

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

Containers can include their required shared packages and app packages, but tenant context, permission checks, activation checks, audit context, and feature flags must remain active in every runtime.

## Build Output Rule

All build outputs should land under the root `dist/` folder using the same source structure:

```text
dist/apps/platform/api
dist/apps/platform/web
dist/apps/core
dist/apps/core/web
dist/apps/billing
dist/apps/billing/web
dist/apps/crm/web
dist/packages/framework
dist/packages/platform
dist/packages/ui
```

Do not rely on app-local build output as the final artifact location. Root `dist/` is the packaging surface for Docker and release collection.

## Turbo Cache Rule

App-local `.turbo` folders should not be kept under `apps/`. Root build and dev workflows should clean app-local Turbo folders so the workspace stays easy to inspect and package.

## Working Rule

Platform activates and composes apps. Core supplies common business foundation. Each app owns its own backend and frontend. Containers bind selected apps into product bundles.
