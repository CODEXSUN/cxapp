# Engineering Standards

## Purpose

These standards keep CODEXSUN clean while allowing fast development.

## Code Organization

Code should be organized by product meaning and module ownership.

Recommended conceptual structure:

- Platform core.
- Domain modules.
- Industry packs.
- Shared UI.
- Shared types.
- Infrastructure adapters.
- Desktop shell.
- Mobile app.
- Agent tools.

## Naming Standards

Use names that match business language.

Good names:

- `Invoice`
- `Ledger`
- `StockMovement`
- `TenantActivation`
- `SyncConflict`
- `GarmentSizeMatrix`

Avoid vague names:

- `DataManager`
- `CommonHelper`
- `ProcessThing`
- `ModuleUtil`
- `CustomLogic`

### Module And Route Naming

Keep module, menu, and route names consistent so tenant, platform, and app registries do not drift.

- Module keys, group keys, menu keys, route slugs, and registry identifiers must use lowercase kebab-case.
- Use plural names for collection-style modules and routes, such as `contact-emails`, `rbac-roles`, `purchase-receipts`, and `site-sliders`.
- Use singular names only for true singleton areas, and document the reason near the registry or route definition.
- Do not use camelCase, PascalCase, snake_case, spaces, or mixed naming in public module keys or menu routes.
- Tenant menu routes must follow `/tenant/<group-key>/<module-key>`.
- Tenant drill-down child routes must follow `/tenant/<group-key>/<parent-module-key>/<child-module-key>` and store the child row with `parentModuleId`.
- Backend API routes should use the owning app prefix and the same kebab-case/plural resource naming unless an existing versioned API contract already exists.
- If source inspiration uses camelCase or table-style names, normalize them before adding CODEXSUN registry entries.

### Module Ownership

Keep child modules with their real owner instead of naming them by where they are displayed.

- Contact-owned child modules belong under the tenant `contacts` group, such as `contact-emails`, `contact-phones`, `contact-social-links`, `contact-bank-accounts`, and `contact-gst-details`.
- Company-owned child modules belong with company ownership under tenant `master`, such as `company-emails`, `company-phones`, `company-social-links`, and `company-bank-accounts`.
- Shared polymorphic modules belong in tenant `foundation` only when the data model is explicitly owner-based, such as `address-book` with `owner_type` and `owner_id`.
- Do not create context-specific duplicates such as `web-contact-*`, `employee-contact-*`, or `company-contact-*` unless the domain has different fields, lifecycle, permissions, or storage. Prefer adding owner support to the shared model or adding a correctly owned child module.

## TypeScript Standards

- Prefer explicit domain types.
- Avoid `any` unless there is a documented reason.
- Use validation at API boundaries.
- Keep shared types stable.
- Do not expose database models directly to clients.
- Keep command and query shapes clear.
- Use strict TypeScript from day one.
- Enable `noUncheckedIndexedAccess`.
- Enable `exactOptionalPropertyTypes`.

## Lint And Format Standards

- Use ESLint for code quality rules.
- Use Prettier for formatting.
- Use Knip to detect unused dependencies, files, and exports.
- CI should fail on lint, format, type, or Knip violations once the foundation is active.

## Backend Standards

- Routes should be thin.
- Application services should orchestrate use cases.
- Domain logic should not live in route handlers.
- Infrastructure adapters should hide provider details.
- Queue jobs must be idempotent where possible.
- Events must include tenant context.
- Errors should be structured.

## Frontend Standards

- Use the central design system.
- Use TanStack Query for server state.
- Use TanStack Table for serious data grids.
- Keep forms predictable.
- Show loading, empty, error, and permission states.
- Keep business screens dense and scannable.
- Buttons and button-like controls must use `cursor: pointer`; disabled actions must use a disabled/not-allowed cursor.
- Do not place business rules only in frontend.

## Database Standards

- Migrations must be ordered and immutable.
- Indexes should support common filters.
- Financial data should preserve history.
- Soft delete business records unless permanent deletion is justified.
- Audit fields are required for important records.
- Tenant-specific databases must follow the same migration contract.

## Event Standards

Events should contain:

- Event name.
- Event version.
- Tenant context.
- Actor context where available.
- Correlation ID.
- Occurred timestamp.
- Payload.

Events should not contain unnecessary sensitive data.

## Queue Standards

Jobs should contain:

- Job name.
- Tenant context.
- Retry policy.
- Idempotency key where useful.
- Correlation ID.
- Clear failure reason.

Long-running jobs should expose progress where useful.

## Documentation Standards

Update docs when:

- A domain rule changes.
- A module contract changes.
- A new event is added.
- A new integration is added.
- A sync rule changes.
- An enterprise rule changes.
- A user-facing workflow changes significantly.
