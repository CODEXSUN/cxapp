# CODEXSUN

Software makes simple.

## Working Repository

This CODEXSUN project is owned and developed from:

```text
E:\Workspace\prefiq\codexsun
```

Treat this checkout and its `PREFIQ/codexsun` Git remote as the current project.
Do not use files, configuration, or assumptions from older CODEXSUN/CXSUN
workspaces outside `E:\Workspace\prefiq`.

CODEXSUN is a monorepo foundation for a multi-tenant business application
platform. The current workspace includes the Platform API, Platform web shell,
shared Framework and UI packages, composed Core and Billing business modules,
tenant-owned Mail modules, master database bootstrap, and version/changelog
tooling.

## Start

```bash
npm install
npm run dev
```

The single root command starts the Platform API and Platform web shell together.
Core, Billing, and Mail attach as packages; they have no standalone development
entrypoints.

Install dependencies only from this repository root. All apps, packages, and
tools resolve dependencies from the root `node_modules`; workspace-local
`node_modules` folders are removed automatically and rejected by
`npm run dependencies:check`.

Platform API: <http://127.0.0.1:7010>

Platform web: <http://127.0.0.1:7020>

## Docker Deployment

Docker deployment files live in `.container/`. Shared MariaDB, Redis, and
Media services are installed once alongside the composed Platform API and web
runtime.

```bash
bash .container/setup.sh billing
```

For a local source update:

```bash
bash .container/deploy.sh billing up
```

For a registry-based release, publish on CI and upgrade the Platform stack on
the deployment host:

```bash
bash .container/deploy.sh billing publish
bash .container/deploy.sh billing upgrade
```

MariaDB is exposed at `127.0.0.1:3307`; its application username, password,
and Billing master database are initially imported from the repository `.env`.
Normal updates preserve deployment configuration, credentials, databases,
uploads, and named volumes. See `.container/README.md` for the full port map,
registry flow, persistence contract, and verification commands.

## Workspace

```text
apps/platform/api
apps/platform/web
apps/core/api
apps/core/web
apps/billing/api
apps/billing/web
apps/mail/api
apps/mail/web
packages/framework
packages/ui
tools/version
assist
```

## Strict UI/Form Guardrails

Before changing tenant/common/master forms, relation lookups, switch cards, placeholders, or shared form controls, read:

```text
assist/devops/ui-form-regression-guardrails.md
```

Required commands:

```bash
npm run check
npm run build
```

Use the root checks before finishing shared UI, lookup, common module, or master
module work.

## Strict App Module Shape

Business apps keep backend and frontend modules paired:

```text
apps/billing/api/src/modules/sales
apps/billing/web/src/modules/sales
apps/billing/web/src/shared
```

Backend modules must use the complete behavior-bearing file contract in `assist/architecture/module-boundaries.md`.

Frontend full modules use `index.ts`, `sales.workspace.tsx`, `sales.list.tsx`, `sales.form.tsx`, `sales.services.ts`, `sales.hooks.ts`, `sales.types.ts`, `sales.schema.ts`, and `sales.spec.ts`, with settings/print files when those capabilities exist. Alias-only wrappers and empty role files are forbidden.

Use `web/src/shared` only for cross-module web code; module-specific screens stay under `web/src/modules/{module}`.
