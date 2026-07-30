# Legacy Client Migration Runbook

## Purpose

Use this runbook when moving an older client database into a CODEXSUN tenant.

## Intake

Create a folder under `assist/migrations/legacy/<client-key>/` and copy the template files from `_template`.

Collect:

- Source database engine and version.
- Schema dump and sample data dump.
- Table list, row counts, primary keys, unique keys, and relationship notes.
- Files or storage paths.
- Modules used by the client.
- Timezone, currency, GST, and numbering assumptions.
- Data quality risks.
- Cutover date and freeze window.

## Mapping

Every import must map source fields explicitly to target CODEXSUN modules, tables, and columns. Unknown tables do not import directly into production tables.

Each mapped field needs:

- Transform rule.
- Required/default behavior.
- Lookup dependency.
- Conflict rule.
- Validation rule.

## Staging And Dry Run

1. Extract source data into staging tables or a staging database.
2. Profile missing, duplicate, and invalid values.
3. Transform rows into the CODEXSUN staging shape.
4. Validate required fields and references.
5. Run a dry-run import.
6. Review row-level created, updated, skipped, failed, and conflict results.
7. Import into a sandbox tenant for user verification.

## Final Import

- Freeze or delta-sync the old system during the cutover window.
- Run the final import with approval.
- Preserve legacy source system and source row id on every imported row.
- Never hard-delete CODEXSUN records from old-system deletes without explicit review.
- Keep the old system read-only until the customer signs off.
