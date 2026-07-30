# CODEXSUN Agent Guide

## Purpose

This is the authoritative working note for every human or AI agent changing CODEXSUN. Read this file first. Open a specialized Assist document only when the task touches that area.

If older planning text conflicts with this guide, `assist/governance/rules.md`, or the current codebase, follow the current guide and governance rules. Historical changelog entries describe past work; they are not current implementation instructions.

## Required Reading

For every code change, read:

1. `assist/AGENT-GUIDE.md`
2. `assist/governance/rules.md`
3. The closest module files and public composition points

Read additionally when relevant:

- UI or forms: `assist/documentation/design-system-helper.md`
- App/module structure: `assist/architecture/module-boundaries.md`
- API contracts: `assist/governance/api-guidelines.md`
- Tenancy or databases: `assist/architecture/tenant-isolation.md`
- Releases or versions: `assist/operations/versioning.md`
- Database migrations: `assist/operations/database-migration-runbook.md`
- Deployment: `assist/architecture/deployment-model.md`
- Current repository inventory: `assist/documentation/project-inventory.md`
- Product meaning: the relevant file under `assist/product/` or `assist/industries/`

Do not read historical blueprints, product plans, or runbooks by default when they do not affect the task.

## Repository Rules

- Treat `E:\Workspace\codexsun\cxapp` as the canonical local working repository and project root.
- Do not use older CODEXSUN/CXSUN checkouts outside `E:\Workspace\codexsun\cxapp` as project references.
- Use npm only from the repository root.
- Keep one root `node_modules`, one root `package-lock.json`, and one root `dist`.
- Never create workspace-local `node_modules`, `dist`, `dist-types`, pnpm stores, or alternative lockfiles.
- Preserve unrelated user changes in the working tree.
- Use root scripts for dependency checks, formatting, lint, TypeScript, boundaries, builds, versions, and releases.
- Generated runtime logs, caches, IDE state, and agent run output do not belong in the repository.

## Architecture Boundary

- CODEXSUN is a modular monolith with explicit application and leaf-module ownership.
- One business entity belongs to one backend leaf and one frontend leaf.
- Composition roots register and order modules; they do not own business CRUD.
- Shared infrastructure is limited to transport/session context, environment readers, observability, stable framework contracts, and reusable UI primitives.
- Fields, schemas, types, migrations, repositories, services, routes, seeds, forms, lists, hooks, workspaces, settings, reports, print behavior, and lifecycle rules belong to their business module.
- Tenant database selection is the isolation boundary for tenant business data. Never silently reintroduce redundant tenant columns where the application uses isolated tenant databases.

## Module-Owned Backend Pattern

A reduced synchronous CRUD module owns exactly these active roles:

```text
{module}.migration.ts
{module}.module.ts
{module}.repository.ts
{module}.routes.ts
{module}.seed.ts
{module}.service.ts
{module}.types.ts
index.ts
```

Rules:

- Migration: concrete table, columns, indexes, uniqueness, foreign keys, timestamps, and status. Prefer one consolidated `sql.raw()` table statement.
- Module: stable key and registration for only its routes.
- Repository: concrete SQL for only its table and owned relation reads.
- Service: normalization, parent validation, duplicate handling, protected records, safe deletion, and lifecycle decisions.
- Routes: fixed URLs with Zod request/response schemas through `registerContractRoute()`; no direct request casts.
- Seed: deterministic and repeatable data owned by the leaf; resolve parents through persisted identity.
- Types: only the leaf's records, payloads, filters, statuses, and owned relation responses.
- Index: intentional public exports only.

A full asynchronous module adds real event, worker, and sync roles only when those capabilities exist. Never add placeholders to satisfy a visual file pattern.

## Module-Owned Frontend Pattern

A CRUD frontend module owns:

```text
{module}.workspace.tsx
{module}.list.tsx
{module}.form.tsx
{module}.services.ts
{module}.hooks.ts
{module}.schema.ts
{module}.types.ts
index.ts
```

Rules:

- Types: exact record, payload, filter, status, and minimal lookup contracts.
- Schema: strict executable validation; no passthrough of unrelated fields.
- Services: fixed module URLs and typed module operations; no arbitrary path arguments.
- Hooks: module-specific query keys and cache behavior.
- Form: only fields, validation, and create/edit state for the entity.
- List: only columns, badges, protected indicators, and row actions for the entity.
- Workspace: filters, pagination, dialog selection, mutations, notifications, invalidation, and composition.
- Index: public module surface without compatibility wrappers.

Form, list, and workspace must be distinct implementations. Identical files, aliases, wrappers, and re-exported implementations are boundary failures.

## Relationship Pattern

- A child uses a parent through a fixed public lookup API, injected public contract, or approved event.
- A child must not import the parent's private repository, service, hooks, form, seed array, or internal types.
- The child owns its minimal lookup option type and fixed request.
- Forms submit real parent IDs, and services verify those parents before writing.
- Migration order, seed order, foreign keys, relation responses, and delete blockers must describe the same hierarchy.
- Relation endpoints belong to the leaf owning the primary returned record.

Reference hierarchy:

```text
Country -> State -> District -> City -> Pincode
```

Pincode owns its reverse relation response containing City, District, State, and Country.

## CRUD Interaction Pattern

Unless a documented domain rule says otherwise, modules provide:

- List and search
- Create popup
- View details
- Edit popup
- Suspend/deactivate
- Restore/activate
- Force delete with dependency protection
- Explicit Active/Inactive status presentation

Protected seeds must be blocked in frontend actions and backend services. Return a clear protected-record response rather than pretending the record is missing.

When a table row opens View, action/menu clicks must stop propagation so Edit or lifecycle operations do not open a second dialog.

## Database Pattern

- Internal primary keys use `INT NOT NULL AUTO_INCREMENT PRIMARY KEY` in Core/Common tables unless a documented application rule requires another identity model.
- Status fields use `VARCHAR(24) NOT NULL DEFAULT 'active'`.
- Use `created_at` and `updated_at`; add `deleted_at` only where soft deletion is part of the module contract.
- Foreign IDs use the same integer type as their parents.
- Unique keys reflect the actual duplicate policy and service error messages.
- `CREATE TABLE IF NOT EXISTS` does not upgrade existing tables. Report when a fresh migration or explicit alteration is required.
- Seeds must be ordered, repeatable, and safe to rerun.

## UI Pattern

- Use `@codexsun/ui` controls and workspace primitives.
- Use `WorkspaceLookup` for persisted relationships.
- Use shared table, filters, pagination, row actions, upsert dialog, banners, and status badges.
- Required fields show required markers and useful validation messages.
- Status badges use explicit tones; do not rely on an unrelated generic status mapping.
- Loading, empty, API error, confirmation, and success states are required.
- Do not create module-specific business behavior inside `packages/ui`.

## Forbidden Patterns

Reject all of the following:

- Generic entity `Kind` unions used to render sibling modules.
- Metadata definition registries controlling fields, columns, paths, or CRUD.
- `listRecords(path)`, table-name arguments, or arbitrary module paths.
- Centralized Common Master, Location, or CRUD business engines.
- Shared repositories, services, schemas, forms, or workspaces containing module fields.
- Wrapper, alias, dummy, simplified, borrowed, or reserved role files.
- Identical form/list/workspace contents.
- Private cross-module imports.
- Direct request casts in backend routes.
- Frontend payload types containing sibling fields.
- `.passthrough()` used to accept unrelated business input.
- Frontend-only protection without backend enforcement.
- Force deletion that depends only on raw database constraint errors.

## Working Procedure

### Before changing code

1. Read this guide, governance rules, and the owning module.
2. Inventory backend/frontend files, public exports, routes, tables, parents, children, and composition points.
3. Search for wrappers, generic definitions, dynamic paths, centralized CRUD, private imports, stale exports, and files outside the owner.
4. Identify database compatibility and tenant impact.

### While changing code

1. Keep edits inside the owner and legitimate composition/infrastructure boundaries.
2. Keep database, backend types, routes, frontend types, schemas, and controls aligned.
3. Preserve parent validation, protected rows, dependencies, lifecycle, and relation behavior.
4. Remove obsolete implementation and exports in the same change.

### Before completion

1. Re-inventory the module.
2. Scan for forbidden patterns and duplicate role hashes.
3. Run Prettier and focused ESLint.
4. Run backend and frontend TypeScript.
5. Run `node tools/check-module-boundaries.mjs <app>`.
6. Run relevant production builds with the configured root environment.
7. Run `npm run dependencies:check`.
8. Run database/E2E verification when available.
9. Report skipped checks and existing-database migration requirements explicitly.

Never claim that formatting, lint, TypeScript, boundaries, builds, browser behavior, persistence, or E2E passed unless that exact check ran successfully.

## Documentation And Versions

- Update the closest authoritative document when architecture, ownership, database behavior, public contracts, operations, or agent rules change.
- Use only `assist/documentation/CHANGELOG.md` for versioned release history.
- Do not create task-specific handoff or gap documents inside Assist after work is complete.
- Version bumps occur only when explicitly requested and must follow `assist/operations/versioning.md`.
- Historical changelog entries are immutable.

## Final Reporting

Report:

- Outcome first
- Files or module areas changed
- Ownership and relationship decisions
- Database compatibility requirements
- Checks that passed
- Checks skipped or blocked
- Any remaining concrete blocker

Do not describe planned, inferred, or unexecuted verification as completed.

## Shared-Domain Authentication Contract

- Production application traffic uses `app.codexsun.com` as the canonical shared host.
- On that host, an exact, unique Corporate ID selects the tenant before user credentials are checked. Tenant code and slug are not Corporate ID aliases.
- A custom host may select a tenant only after its domain mapping is active and DNS-verified. The canonical host can never be assigned to one tenant.
- The server owns tenant routing. Never trust browser-supplied tenant ID, database name, company ID, or financial-year headers without replacing and validating them from signed session claims and the tenant registry.
- Tenant database secrets are server-only references and resolution fails closed. Never fall back to a global password for an unknown tenant secret reference.
- Browser authentication uses one encrypted, `HttpOnly`, `Secure`, host-only, `SameSite=Strict` cookie. Never persist JWTs, refresh tokens, or session IDs in localStorage or sessionStorage.
- Every login clears legacy browser auth material and revokes the current server session before establishing the new identity. A tenant switch must reload the desk and clear client query/runtime caches.
- Cache only non-secret session context: tenant/company labels and IDs, default company, financial year, enabled modules, landing page, and safe settings. Never cache credentials, authorization decisions, permissions, secrets, or raw tokens. Clear this cache on login and logout.
- Authorization and tenant status are checked live for protected requests; cached session context is a performance convenience, not an authority.
