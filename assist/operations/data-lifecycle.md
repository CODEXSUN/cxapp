# Data Lifecycle

## Purpose

CODEXSUN must manage data from creation to archival or deletion while preserving business, legal, and audit requirements.

## Lifecycle Stages

1. Created.
2. Active.
3. Revised.
4. Approved.
5. Synced.
6. Locked.
7. Archived.
8. Deleted or retained.

Not every record uses every stage.

## Retention Rules

Retention should be defined per record type.

Examples:

- Accounting records: long-term retention.
- Compliance documents: long-term retention.
- Activity logs: policy-based retention.
- AI conversations: configurable retention.
- Temporary imports: short retention.
- Failed job payloads: limited retention.

## Archival

Archive old data when:

- It slows normal workflows.
- It belongs to closed financial years.
- It is needed only for audit or reports.
- It can be moved to cheaper storage safely.

Archived records should remain searchable where required.

## Deletion

Deletion rules:

- Business records usually use soft delete.
- Financial and compliance records should not be physically deleted casually.
- Personal data deletion requests need a defined process.
- Deleted records should not break reports.
- Deletion should be audited.

## Data Export

Tenants should be able to export their data according to subscription and support policy.

Exports must:

- Respect permissions.
- Include tenant context.
- Log who exported data.
- Avoid exposing secrets.
- Use background jobs for large exports.
