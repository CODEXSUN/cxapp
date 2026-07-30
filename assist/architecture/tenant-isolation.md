# Tenant Isolation

## Goal

Every tenant must behave like a separate customer environment even when multiple tenants share the same codebase, app servers, containers, or infrastructure.

For the current implementation status, blockers, required tests, and AI guardrails, also read:

```text
assist/architecture/tenant-readiness-track.md
```

## Isolation Levels

CODEXSUN should support multiple isolation patterns:

- Dedicated database per tenant.
- Shared infrastructure with strict tenant routing.
- Dedicated containers for high-value or regulated tenants.
- Local offline store per tenant on desktop or mobile.

The default planning assumption is one database per tenant where business isolation, backup, restore, or customization requires it.

## Tenant Context

Tenant context should include:

- Tenant ID.
- Tenant slug or code.
- Tenant database connection target.
- Active subscription.
- Active industry pack.
- Active apps and features.
- Locale and compliance settings.
- User role and permission scope.

Current implementation note: tenant login resolves the tenant database for tenant user authentication, and Core business requests require a validated `x-tenant-db` context. Core rejects the Platform master database and routes repositories through the request-bound tenant database connection. Core Common master tables therefore do not duplicate tenant identity in `tenant_id` columns; the selected database is their isolation boundary.

Tenant database provisioning follows the tenant's selected application set. Platform identity/access migrations run
first. Billing activation then runs Core's owned prerequisite migrations and seeds before Billing's owned migrations
and seeds. Mail migrations run only when Mail is enabled; Task Manager currently has no tenant SQL lifecycle. Tenant
create/update and managed setup, reinstall, and migration actions use this same ordered composition contract.
Managed lifecycle actions invalidate only the target tenant's Core and Billing bootstrap state before running, so a
database recreated while the API process remains online receives the complete selected-app schema.

Tenant context must be available in:

- HTTP requests.
- WebSocket events.
- Queue jobs.
- Domain events.
- Scheduled tasks.
- Sync payloads.
- Audit logs.
- AI tool calls.
- Integration calls.

Tenant context may be resolved from custom domain, subdomain, path fallback, or explicit headers depending on client and app surface. Production tenant web should primarily use custom domain or subdomain. Path fallback is reserved for development, internal tools, and Super Admin support flows. Jobs and events must always carry tenant ID explicitly.

Application tenant resolution only needs domain-to-tenant mapping. SSL certificates, DNS, Cloudflare, Nginx, and reverse proxy concerns belong to infrastructure.

Production rule: after domain/subdomain resolution is implemented, the request host must bind the tenant first. Headers may carry the already-resolved tenant ID to APIs, but they must not be treated as an independent source of truth for tenant identity.

## Data Access Rules

- No tenant business data access without tenant context.
- No global query should accidentally read tenant data.
- Tenant user sessions must not be able to access another tenant by changing request headers.
- Shared tables that temporarily store tenant business data must include tenant ownership filters.
- Dedicated tenant database routing must fail closed when the tenant database mapping is missing, inactive, or not ready.
- Background jobs must restore tenant context before work starts.
- Integration callbacks must resolve tenant context safely.
- Reporting must respect tenant and permission boundaries.
- AI assistants must not access data outside the current tenant or approved support scope.

## Multi-Company Scope

One tenant may own many companies. Company, branch, warehouse, counter, device, accounting year, GST identity, document numbering, and default-company selection must remain inside the tenant boundary. Cross-company views are allowed only inside the same tenant and only through permission-aware workflows. Cross-tenant company access is never allowed.

## Customization Rules

Tenant customization should be stored as structured configuration:

- Enabled apps.
- Enabled features.
- UI preferences.
- Print templates.
- Numbering formats.
- Tax settings.
- Workflow settings.
- Custom fields.
- Integration credentials.

Customizations must be versioned when they affect data shape, billing logic, accounting, or compliance output.

## Backup And Restore

Each tenant should have a planned backup and restore strategy:

- Full database backup.
- File storage backup.
- Configuration backup.
- Audit trail retention.
- Restore testing.
- Point-in-time recovery where possible.

## Security Notes

- Tenant database credentials should not be exposed to clients.
- API tokens must be tenant-scoped.
- External integration credentials must be encrypted.
- Support access must be audited.
- Cross-tenant admin actions need elevated permission and logging.
