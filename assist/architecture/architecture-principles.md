# Architecture Principles

## Architecture Style

CODEXSUN uses a modular monolith with DDD boundaries, event-driven workflows, queue processing, and container-ready deployment.

This means the application can start as one understandable system while keeping enough boundaries to split, scale, or deploy modules separately later.

## Principles

### 1. One Codebase, Many Apps

The platform must support many apps inside a single codebase. Apps can be enabled, disabled, configured, or customized per tenant.

### 2. Tenant Context Everywhere

Every request, event, job, sync packet, report, and integration call must include tenant context.

### 3. Modules Own Their Business Rules

Business logic belongs inside domain modules. Shared packages can provide infrastructure, but they must not silently own business meaning.

### 4. Events For Side Effects

When one module needs another module to react, prefer events for side effects.

Example:

- Invoice created.
- Payment received.
- Stock adjusted.
- Tenant activated.
- Subscription expired.
- Sync conflict detected.

### 5. Queues For Work That Can Wait

Use queues for slow, retryable, external, or scheduled work.

Examples:

- Sending mail.
- Sync processing.
- e-Invoice generation.
- WhatsApp messages.
- Report exports.
- Large imports.
- AI background analysis.

### 6. Offline Is A Product Feature

Offline support is not only a cache. It is a workflow design requirement.

Each offline-capable module must define:

- What data can be created offline.
- What data can be edited offline.
- How conflicts are detected.
- How conflicts are resolved.
- What must wait for online confirmation.

### 7. Runtime Activation

Features, modules, industry packs, and integrations should be activated through subscription and tenant configuration without redeploying the whole application.

### 8. Compliance By Design

Accounting, billing, tax, audit, and legal document flows should be designed carefully from the start. Compliance records must be traceable.

### 9. AI Must Respect Boundaries

AI assistants must follow the same tenant, role, permission, and audit rules as normal users.

### 10. Clear Extension Points

Customization should happen through designed extension points:

- Settings.
- Feature flags.
- Plugins.
- Templates.
- Workflow definitions.
- Integration adapters.
- Industry overrides.

## Recommended Layering

Each module should be organized conceptually into:

- Domain layer: entities, value objects, domain services, business rules.
- Application layer: use cases, commands, queries, orchestration.
- Infrastructure layer: database, queue, external APIs, file storage.
- Interface layer: HTTP routes, UI views, desktop/mobile adapters, event handlers.

## Avoid

- Tenant-specific hacks in shared modules.
- Cross-module database writes.
- Untracked side effects.
- Business rules inside UI components.
- Business rules inside generic helpers.
- AI tools with unrestricted database access.
- Offline sync without conflict planning.
- Feature flags that bypass permission checks.
