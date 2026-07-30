# Platform Foundation

## Purpose

`@cxapp/platform` owns shared platform business concepts used by runnable apps.

Framework stays technical. Platform owns tenant, identity, subscription, activation, settings, audit, notifications, roles, and permissions language.

## Current Platform Package Scope

The first package foundation provides subpaths for:

- `@cxapp/platform/tenant`
- `@cxapp/platform/auth`
- `@cxapp/platform/users`
- `@cxapp/platform/roles`
- `@cxapp/platform/permissions`
- `@cxapp/platform/subscription`
- `@cxapp/platform/activation`
- `@cxapp/platform/audit`
- `@cxapp/platform/notifications`
- `@cxapp/platform/settings`

## Current Runtime Wiring

Platform API now consumes:

- **`@cxapp/platform/auth`**: Login request contract, desk-to-user-type mapping, password hashing/verification, JWT creation/verification, cookie/hybrid session support via `DatabaseSessionStore`.
- **`@cxapp/platform/tenant`**: `TenantLookupService` for tenant-by-code resolution and database resolution. `MasterDbTenantRepository` for CRUD operations. `TenantService` for validation and DTO mapping.
- **`@cxapp/platform/audit`**: `MasterDbAuditRepository` and `AuditService` for writing auth and tenant mutation events.
- **`apps/platform/api/src/auth/guards.ts`**: Shared guard helpers (`requireSession`, `requireUserType`, `requireSuperAdmin`, `requireTenantMatch`, `requirePermission`, `requireActiveTenant`, `requireFeatureEnabled`).

Tenant CRUD SQL is behind `MasterDbTenantRepository` and `TenantService`. Auth and tenant mutation actions write audit events. SQL bootstrapping remains in `apps/platform/api` for now.

## Boundary Rules

- Platform package may define business language and rules.
- Platform package should not own Fastify boot, generic database connectors, queues, or storage adapters.
- App route handlers may orchestrate Platform services but should not duplicate Platform business concepts.
- Shared auth user types remain separated as Super Admin, Staff, and Tenant.

## Next Platform Work

- Full RBAC screen and role-permission mapping UI.
- Full tenant provisioning workflow.
- Tenant database lifecycle management.
- Feature toggle / activation admin screens.
- Event outbox persistence for cross-service events.
