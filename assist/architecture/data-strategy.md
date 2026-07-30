# Data Strategy

## Goal

CODEXSUN data design must support tenant isolation, industry customization, offline sync, reporting, accounting correctness, and long-term migration safety.

## Database Direction

Primary database:

- MariaDB.

Preferred tenant data model:

- Dedicated database per tenant where practical.
- Shared platform database for global metadata.
- Clear separation between platform data and tenant business data.

## Data Categories

### Platform Data

Examples:

- Tenants.
- Plans.
- Global feature catalog.
- Platform users where required.
- System configuration.
- Deployment metadata.

### Tenant Business Data

Examples:

- Customers.
- Vendors.
- Items.
- Invoices.
- Vouchers.
- Ledgers.
- Stock.
- Tasks.
- Files.
- Reports.

### Tenant Configuration Data

Examples:

- Enabled modules.
- Feature flags.
- Print templates.
- Custom fields.
- Numbering settings.
- Workflow settings.
- Integration credentials.

### File Data

Files should be stored through a switchable storage adapter.

Supported direction:

- Local filesystem for development and simple local use.
- S3-compatible storage for cloud.
- MinIO for self-hosted S3-compatible storage.
- FileBrowser.org for managed/self-hosted file browsing where appropriate.
- MinIO and FileBrowser.org can be bundled into one custom storage utility container.

Examples:

- Public product images should use S3-compatible storage in cloud.
- Invoice documents should use S3-compatible storage in cloud.
- Compliance documents should use durable object storage.
- Queue jobs, events, and logs should reference files instead of carrying file blobs.

## Data Rules

- Business tables must include audit metadata.
- Tenant-specific records must never be stored without tenant ownership.
- Financial records should avoid hard deletes.
- Compliance records should preserve source data used during generation.
- Imports must support validation before final commit.
- Large reports should use read models where needed.
- Offline records need sync metadata.

## Audit Metadata

Important records should track:

- Created by.
- Created at.
- Updated by.
- Updated at.
- Deleted by if soft deleted.
- Deleted at if soft deleted.
- Tenant ID or tenant database identity.
- Source device where offline is supported.
- Correlation ID for events and jobs.

## Migration Safety

Migrations must be:

- Ordered.
- Repeatable in deployment flow.
- Tested with tenant databases.
- Documented when data risk exists.
- Backed by rollback or recovery notes where possible.

## Reporting Direction

Reports should not weaken module boundaries.

Use:

- Read models.
- Reporting views.
- Export jobs.
- Permission-aware query services.
- Cached report snapshots for heavy reports.

# Enforced database ownership

The Platform master database is restricted to global Platform and Super Admin state. Core masters/common data, Billing, tenant users, tenant roles, and tenant permissions belong only to the selected tenant database.

Core Common tables inside a dedicated tenant database must not add redundant `tenant_id` columns or accept a second tenant selector. Their tenant identity is the validated database context. Cross-tenant or shared-database tables in other application boundaries may still require explicit tenant keys when their storage model calls for them.

Business APIs must require an explicit validated tenant database context and must reject `DB_MASTER_NAME`. They must not bootstrap business tables into the master database during application startup.

Task Manager retains its existing JSON store and is outside this SQL database split.
