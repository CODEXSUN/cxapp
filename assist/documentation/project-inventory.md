# CODEXSUN Project Inventory

> Database boundary update: the Platform master database contains unprefixed global Platform/Super Admin tables. Tenant Platform runtime tables use `app_`; composed apps keep their owner prefixes. Every database records migrations in `migration_schema`. Platform Task Manager remains JSON-backed. DevKit Platform Registry data and its audit activity are database-backed in both master and enabled tenant databases.

## Purpose

This document records what is present in the current CODEXSUN workspace. Use it as the first practical inventory before
planning new work, because some assist files describe future direction or older foundation snapshots.

Last reviewed: 2026-08-16.

## Working Repository

The current and authoritative checkout is:

```text
E:\Workspace\codexsun\cxapp
```

Its Git remote is `https://github.com/CODEXSUN/cxapp.git`. Older CODEXSUN/CXSUN
workspace paths are not project sources and must not be used for implementation,
configuration, documentation, or verification.

## Current Workspace Shape

```text
apps/
  platform/
    api/
    web/
    windows/
  core/
    api/
    web/
  billing/
    api/
    web/
  mail/
    api/
    web/
  devkit/
    api/
    web/

packages/
  framework/
  ui/

tools/
  version/
  *.mjs

assist/
  agents/
  architecture/
  blueprint/
  devops/
  documentation/
  execution/
  governance/
  handoff/
  industries/
  operations/
  product/
```

The root package uses npm workspaces with `apps/*/*`, `packages/*`, and `tools/*`.

## Runtime Application And Composed Packages

### Platform

Platform owns the SaaS foundation.

- `apps/platform/api`: Fastify API for tenant identity, auth, app registry, database setup, tenant provisioning, and
  platform operations.
- `apps/platform/web`: React/Vite shell for the domain-resolved tenant app portal, login, super-admin desk, admin
  desk, tenant desk, tenant UI, and design-system gallery.
- `apps/platform/windows`: WinUI 3/.NET 10 host that opens the shared Platform React UI through WebView2 and stores
  only a safe one-workspace projection in device-local SQLite.

Platform is the only runnable application: API `7010` and Web `7020`.

Current Platform API modules:

- `app-registry`
- `task-manager` (JSON-backed)
- `tenant`

Current Platform Web modules:

- `design-system`
- `task-manager`
- `tenant`
- `tenant-portal` (read-only public projection owned by `platform.tenant`)

### DevKit

DevKit owns the Platform Registry application and is composed by Platform through its public API and web contracts.

- `apps/devkit/api`: the request-scoped Platform Registry Fastify module, registry migration, JSON registry seed,
  and registry audit activity.
- `apps/devkit/web`: the Platform Registry workspace bundle used by the Super Admin desk and enabled tenant desks.
- DevKit migrations and seeds run against the Platform master database for Super Admin and against each enabled
  tenant database for tenant users. Tables use the `devkit_` owner prefix and migration state uses
  `migration_schema`.
- Platform supplies the authenticated request database and actor. DevKit does not resolve tenant identity from
  browser input and uses the existing HttpOnly CXApp session cookie.

### Core

Core owns shared business foundation modules consumed by Platform.

- `apps/core/api`: Fastify plugin package registered by Platform API.
- `apps/core/web`: React module package bundled by Platform Web.

Current Core common modules include location masters, contacts, products, work orders, organisation setup, and the
accounts masters `ledger-groups` and `ledgers`. Each accounts master owns its API migration, repository, service,
routes, seed, and frontend workspace; ledgers reference ledger groups within the tenant database.

### Billing

Billing owns billing-related business modules.

- `apps/billing/api`: Fastify plugin package registered by Platform API.
- `apps/billing/web`: React module package bundled by Platform Web.

Current Billing module:

- `sales`

### Mail

Mail owns tenant-scoped outbound delivery, inbound synchronization, message history, attachments, and provider configuration.

- `apps/mail/api`: Fastify module package with tenant migrations, encrypted settings, SMTP delivery, IMAP/POP3 synchronization, queue workers, retries, events, and public contracts.
- `apps/mail/web`: React workspace for Inbox, Outbox, Drafts, Scheduled, Sent, Failed, Trash, rich compose, attachments, and tenant settings.

Billing document screens consume Mail only through its public web contract to capture the visible invoice or quotation as a PDF and enqueue a branded customer email.

Product development and release tooling preserves those ownership boundaries while deploying one composed runtime.
`npm run stack:impact -- <changed files>` identifies the verification blast radius, while
`npm run stack:plan -- <stack>` prints the composed Platform services, owned migration scopes, and rollback plan.

The `.env` contract contains network configuration only: API/web hosts or origins and ports. Product
names, purpose text, taglines, and other business identity must not be added to `.env`.

## Shared Packages

### `@cxapp/framework`

Shared backend runtime package. It exports API bootstrap helpers, config/env loading, database contracts, errors,
events, health, HTTP envelope utilities, logging, module contracts, queues, storage contracts, and testing helpers.

### `@cxapp/ui`

Shared frontend UI package. It exports components, layouts, menu blocks, design-system tokens, workspace controls,
workspace presets, forms, tables, filters, panels, date picker, autocomplete, drag/drop helpers, print helpers, and
shared styling.

## Tooling

Important root commands:

```text
npm run dev
npm run desktop:build
npm run desktop:run
npm run desktop:publish
npm run desktop:package
npm run desktop:install
npm run desktop:uninstall
npm run build
npm run typecheck
npm run lint
npm run check
npm run verify:platform
npm run check:module-boundaries
npm run dependencies:check
npm run db:migrate
npm run db:seed
npm run db:drop
npm run dbmigrate:fresh
npm run test:e2e:composed-runtime
npm run test:e2e:bootstrap
npm run test:e2e:persistence
npm run test:e2e:organisation
npm run version:show
npm run version:bump
npm run changelog:append
npm run check:versions
```

Shared development dependencies and operational commands are declared only in
the root `package.json`. Workspace manifests retain their package identity,
build/typecheck/lint scripts, and direct runtime dependencies. Only the root
manifest exposes `npm run dev`.

Database commands currently route through `@cxapp/platform-api` and `apps/platform/api/src/database/db-cli.ts`.

## Current Version And Work Update

Current recorded version: `1.0.60`.

Latest changelog entry: `v-1.0.60` on 2026-08-16 at 11:38 am.

Latest recorded work:

- Added the WinUI 3 and .NET 10 Windows enrollment host.
- Added signed MSIX packaging and App Installer updates through GitHub Releases.
- Added current-user install and uninstall scripts.
- Added a private sideloading certificate contract for the first Windows release.
- Workspace version is `1.0.60`.

Current working tree note:

- The working tree was clean before this documentation update.
- Always inspect `git status` before editing and preserve unrelated user changes.

## Documentation Notes

Use these files first for active work:

- `assist/README.md`: high-level product and agent entry point.
- `assist/documentation/CHANGELOG.md`: latest recorded version state and change history.
- `assist/documentation/project-inventory.md`: current repo inventory.
- `assist/documentation/app-bundle-structure.md`: target app/module ownership rules.
- `assist/documentation/design-system-helper.md`: UI and module screen standards.
- `assist/governance/rules.md`: general development rules.
- `assist/governance/engineering-standards.md`: engineering practices.
- `assist/governance/testing-strategy.md`: verification expectations.
- `assist/governance/quality-gates.md`: finish-line checks.

Some execution and handoff files preserve earlier foundation history or future direction. Validate their code paths
against this inventory before treating them as current implementation state.
