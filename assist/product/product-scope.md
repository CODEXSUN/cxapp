# Product Scope

## Product Name

CODEXSUN

## Product Type

SaaS business application platform with web, desktop, and mobile clients.

## Target Customers

CODEXSUN is designed for businesses that need a configurable industry-specific system instead of a one-size-fits-all ERP.

Primary customer types:

- Small and medium businesses.
- Manufacturing units.
- Garments businesses.
- Retail and POS businesses.
- Printing businesses.
- uPVC businesses.
- Software service companies.
- Trading and distribution companies.
- Businesses that require Indian billing, accounting, GST, and compliance.

## Business Promise

CODEXSUN should let a customer start with the modules they need, activate more features when required, customize workflows, work offline when internet is unreliable, and scale without moving to a different system.

## Product Pillars

- Tenant isolation.
- Industry fit.
- Modular apps.
- Runtime activation.
- Offline continuity.
- Compliance confidence.
- Plug-and-play integrations.
- AI-assisted work.
- Developer-friendly architecture.

## Major Product Areas

### Platform Foundation

The platform foundation provides shared services used by all apps and industries.

Includes:

- Tenant management.
- Identity and authentication.
- Role-based access control.
- Subscription and activation.
- Feature flags.
- Settings.
- Audit trail.
- Activity feed.
- Notifications.
- File management.
- Mail support.
- Queue and background job management.
- Integration registry.
- Design system.

### Business Operations

Business operations modules handle day-to-day work.

Includes:

- Sales.
- Purchase.
- Inventory.
- Billing.
- Accounting.
- Tasks.
- Customers.
- Vendors.
- Employees.
- Documents.
- Reports.

- The two products have separate application, API, frontend, module, and data ownership. Shared
  behavior is limited to stable platform/framework contracts and reusable design-system primitives.

### Industry Packs

Industry packs specialize the platform for a specific business domain.

Each industry pack can include:

- Domain models.
- Screens.
- Workflows.
- Reports.
- Print templates.
- Compliance behavior.
- Permissions.
- Sync rules.
- Integrations.

### AI Layer

The AI layer provides assistant capabilities.

Includes:

- CODEIT for development assistance.
- ZERO for business assistance.
- Model routing.
- Tool calling.
- Prompt templates.
- Permission-aware data access.
- Audit and safety policies.

## Out Of Scope For The First Foundation

These areas should not be built too early unless required by a paying customer or core workflow:

- Marketplace billing for third-party developers.
- Full no-code app builder.
- Public plugin store.
- Advanced machine learning training pipelines.
- Multi-country compliance beyond Indian needs.
- Complex microservice separation before module boundaries are stable.

## Success Criteria

The product foundation is healthy when:

- A new tenant can be created safely.
- A tenant can activate selected apps and features.
- Activation can be controlled by app, module, feature, limit, and provider configuration.
- Each tenant's data remains isolated.
- An industry module can be added without rewriting platform services.
- Billing and accounting can adapt per industry.
- Offline records can sync safely.
- CODEIT can guide development work using these docs.
- ZERO can answer business questions only within permitted tenant data.
