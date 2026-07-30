# Domain Map

## Domain Strategy

CODEXSUN should be divided into domains that match business meaning. Each domain owns its language, rules, data, events, and APIs.

Domains should communicate through explicit contracts, not direct table access.

## Core Domains

### Tenant Domain

Owns:

- Tenant profile.
- Tenant database mapping.
- Tenant settings.
- Tenant lifecycle.
- Tenant isolation rules.
- Tenant backup and restore policy.

### Identity Domain

Owns:

- Users.
- Sessions.
- Roles.
- Permissions.
- Authentication providers.
- Password and security policies.

### Subscription Domain

Owns:

- Plans.
- Add-ons.
- Feature activation.
- License status.
- Trial and expiry rules.
- Runtime module access.

### Billing Domain

Owns:

- Invoices.
- Estimates.
- Credit notes.
- Debit notes.
- POS bills.
- Industry bill formats.
- GST calculation.
- e-Invoice and e-Way bill workflow.

### Accounting Domain

Owns:

- Ledgers.
- Groups.
- Vouchers.
- Journals.
- Financial years.
- Reports.
- Compliance exports.

### Inventory Domain

Owns:

- Items.
- Stock movements.
- Warehouses.
- Batches.
- Units.
- Valuation.
- Stock reports.

### Workflow Domain

Owns:

- Tasks.
- Activities.
- Approvals.
- Reminders.
- Status flows.

### Communication Domain

Owns:

- Mail.
- SMS if added.
- WhatsApp.
- Telegram.
- Notification templates.
- Delivery status.

### Integration Domain

Owns:

- External API credentials.
- Integration adapters.
- Webhooks.
- Import and export jobs.
- Integration logs.

### AI Domain

Owns:

- Assistant profiles.
- Model routing.
- Prompt policies.
- Tool permissions.
- AI audit trail.
- Knowledge access.

## Supporting Domains

- Reporting.
- Document templates.
- File storage.
- Search.
- Sync.
- Queue management.
- Audit.
- Settings.

## Bounded Context Rules

- A module must own its own models and business rules.
- Shared utilities must not contain business decisions.
- Cross-domain communication should use application services, public contracts, or domain events.
- Database tables from another domain must not be directly modified.
- UI screens should respect domain ownership even when they combine data from multiple modules.
- Reports may read across domains through approved reporting models or read replicas.
