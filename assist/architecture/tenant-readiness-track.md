# Tenant Readiness Track

## Purpose

This note is the working source of truth for CODEXSUN tenancy. It tells humans and AI assistants what is already implemented, what must remain true, and what is still required before the product can be treated as production-complete for multi-tenant, multi-database, multi-industry, multi-company operation.

## Target Architecture

CODEXSUN is intended to be:

- Multi-tenant: every customer runs inside an explicit tenant context.
- Multi-database: every tenant can have its own database, and production business data should be routed through the tenant database connection.
- Multi-industry: tenants can activate industry packs that enable modules, workflows, defaults, reports, billing behavior, accounting behavior, and print formats.
- Multi-company: a tenant can own multiple companies, branches, warehouses, counters, and devices.
- Domain-bound: production tenant access should resolve the tenant from a custom domain or subdomain, then bind all tenant API calls to that tenant.

## Current Implementation Status

### Implemented

- Tenant registry exists in the master database through `tenants`.
- Tenant database registry exists in the master database through `tenant_databases`.
- Tenant domain mapping exists in the master database through `tenant_domain_mappings`.
- Tenant module activation exists through `tenant_module_activation`.
- Tenant login resolves `tenantCode`, verifies active tenant status, resolves the tenant database, and reads `users` from that tenant database.
- Tenant sessions include `tenantId` and `tenantCode`.
- Tenant web API calls send `x-tenant-id`.
- Tenant API routes reject missing or mismatched tenant context.
- Core routes receive platform guard functions through `CoreRouteContext`, keeping `apps/core` independent from `packages/platform`.
- Common records, contacts, companies, and products are persisted with explicit `tenant_id` filtering.
- Tenant UI E2E coverage verifies route wiring, tenant-scoped CRUD, and wrong `x-tenant-id` rejection.
- Super Admin has database-backed domain and industry registry management.
- Tenant can create multiple companies in the Company master.
- Organisation owns tenant-database `financial_years` and singleton `default_company_settings`
  records. The tenant application desk loads the persisted default company, landing app, and
  accounting year. The sidebar switcher persists company/year changes back to that singleton and
  publishes both values through the shared frontend context for every enabled app.

### Partially Implemented

- Dedicated tenant databases exist for tenant authentication and tenant audit bootstrap, but most tenant business records are still stored in master-database tenant-scoped tables.
- Industry records are managed as platform registry data, but tenant industry activation and industry-pack behavior are not yet wired into tenant runtime.
- Domain mappings are stored and managed, but request host/domain resolution is not yet the primary tenant binding path.
- Subscription service and feature activation are scaffolded; billing-grade subscription enforcement is not complete.
- Generic registry modules are persistent through common records, but many business flows are still generic placeholders rather than full domain modules.

### Not Complete

- Tenant business data is not yet fully routed through the resolved tenant database connection.
- Tenant database migrations are not yet managed by a production cxsync-style tenant migration runner.
- Tenant provisioning does not yet complete the full Platform -> cxdeploy -> cxsync lifecycle.
- Domain/subdomain tenant resolution is not yet enforced before tenant login and API access.
- Industry packs do not yet activate modules, default settings, roles, print formats, reports, dashboards, or offline rules for a tenant.
- Tenant-local roles and permissions are not yet fully database-backed and tenant-configurable.
- Tenant-scoped file metadata, notifications, jobs, events, outbox, queue payloads, and offline sync metadata are not fully implemented.

## Non-Negotiable Rules

- No tenant business route may read or write data without a resolved tenant context.
- A tenant user session must never access a different tenant by changing `x-tenant-id`.
- Platform, Super Admin, and Staff operations must not accidentally inherit tenant desk context.
- Tenant business repositories must require `tenantId` or an explicit tenant database connection.
- Queries against shared tables must always include tenant ownership filters.
- New tenant business tables must include tenant ownership until they move into dedicated tenant databases.
- Background jobs, domain events, sync packets, integration callbacks, AI tools, audit logs, and reports must carry tenant ID explicitly.
- Domain mapping records must stay unique across tenants.
- Tenant-specific behavior must be represented as configuration, activation, industry pack, plugin, or extension point, not hard-coded customer-specific branches.

## Multi-Company Rules

- Company is tenant-owned business data.
- Company records must always be read and written inside tenant context.
- One tenant may create multiple companies.
- Branch, warehouse, counter, device, accounting year, GST identity, billing sequence, and default-company selection must be scoped to the tenant and, where applicable, to a company.
- Cross-company reports inside a tenant are allowed only when the user has permission.
- Cross-tenant company reads are never allowed.

## Industry-Specific Rules

- Industry is a tenant runtime dimension, not a platform shortcut.
- Industry pack activation must be stored per tenant.
- Industry packs may enable modules, seed settings, install print templates, register permissions, configure dashboards, and select workflows.
- Industry logic must not be hidden in shared platform foundation.
- If two industries share stable behavior, extract it into Core or a generic extension point.
- If only one industry needs behavior, keep it in that industry module.
- Billing, accounting, inventory, GST, e-invoice, e-way bill, POS, manufacturing, and reporting differences must be modeled as explicit industry configuration or industry modules.

## Required Tenant Isolation Tests

Every tenant-aware change should keep or add tests around:

- Tenant login resolves the correct tenant database.
- Tenant session includes tenant ID and tenant code.
- Tenant route without `x-tenant-id` is rejected.
- Tenant route with mismatched `x-tenant-id` is rejected.
- Tenant A cannot list, fetch, update, archive, restore, or delete Tenant B records.
- Common records stay isolated by tenant.
- Contacts, companies, products, and future business modules stay isolated by tenant.
- Tenant database resolution fails closed when no ready database mapping exists.
- Domain mapping cannot point one domain to two tenants.
- Domain/subdomain resolution returns the intended tenant once host binding is implemented.
- Industry activation affects only the selected tenant.
- Multi-company records remain inside the tenant and respect company/default-company scope.

## Required Refactor Track

Before declaring production tenancy complete:

1. Add a tenant database connection provider that resolves from trusted tenant context.
2. Move tenant business repositories from master database tenant-scoped tables to tenant database tables, or explicitly document modules that must remain shared.
3. Add tenant database migration/version tracking.
4. Add tenant provisioning workflow status with failure, retry, and rollback states.
5. Add host/domain tenant resolution middleware and make header tenant context a post-resolution transport detail.
6. Add tenant industry activation tables and runtime resolver.
7. Add industry-pack activation services for modules, settings, roles, templates, reports, and dashboards.
8. Add database-level tests using two tenants and two tenant databases.
9. Add job/event/audit tests that prove tenant context is carried across async boundaries.

## AI Assistant Instructions

When changing tenant-aware code:

- Read this file, `assist/architecture/tenant-isolation.md`, `assist/architecture/module-boundaries.md`, and `assist/industries/industry-model.md`.
- State whether the change affects platform, tenant runtime, tenant database, industry activation, or multi-company behavior.
- Search for the route, service, repository, migration, UI, and E2E test that own the affected flow.
- Never remove tenant checks to make a test pass.
- Never introduce a tenant business query without `tenantId` or tenant database routing.
- Never add customer-specific behavior directly inside shared platform code.
- Update this file when a partial item becomes implemented or when a new blocker is found.

## Final Track Status

CODEXSUN is on the correct tenant-aware track, but production-complete tenancy is not finished yet. The current foundation is good: login, tenant identity, module activation, tenant-scoped persistence, domain registry, industry registry, multi-company master data, and E2E mismatch blocking are in place. The main remaining work is to route tenant business data through dedicated tenant databases, enforce domain/subdomain tenant binding, and implement tenant industry activation.
