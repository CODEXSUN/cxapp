# Database Migration Runbook

## Purpose

Use this runbook for CODEXSUN database changes that affect platform or tenant schemas.

## Before Creating A Migration

- Confirm the owning app or module.
- Write the database change as a tracked migration, not a manual production edit.
- Prefer expand/migrate/contract for destructive or risky changes.
- Record affected tables, expected runtime, risk level, and validation SQL in the migration notes.

## Local Restored-Dump Test

1. Create or download a recent safe dump.
2. Restore it into local platform and tenant databases.
3. Set the local `.env` database names to the restored databases.
4. Run `npm run db:migrations:preflight`.
5. Run `CODEXSUN_RESTORED_DUMP_TEST=1 npm run db:migrations:test-local`.
6. Run affected API and app tests.
7. Compare row counts, important totals, and schema snapshots.

## Production Preflight

Production migration preflight requires a verified pre-migration backup:

```text
CODEXSUN_VERIFIED_BACKUP_ID=<backup-run-id>
npm run db:migrations:preflight
```

Do not continue if backup freshness, restore status, tenant targets, or rollback notes are missing.

## Running Migrations

Run migrations through the stable command:

```text
npm run db:migrations:run
```

## Consolidated Lifecycle Order

Framework and UI are database-free infrastructure packages. They do not own migrations or seeders.

Database installation, migration, seeding, tenant setup, and tenant reinstall use one deterministic order:

1. Platform master module migrations.
2. Platform master module seeders.
3. Tenant runtime migrations: module settings, users, roles, permissions, user roles, and role permissions.
4. Core leaf migrations in dependency order: Common lookups, Organisation, then Master modules.
5. Billing leaf migrations: Settings, Sales, Purchase, Export Sales, Quotation, Payment, Receipt, then Dashboard.
6. Mail migration when Mail is enabled for the tenant.
7. Tenant runtime seeders.
8. Core leaf seeders in the same dependency order.
9. Billing seeders for all eight Billing modules and Billing permissions.
10. Mail seeder when Mail is enabled.

All module SQL and seed behavior remains in the owning module's `*.migration.ts` and `*.seed.ts` files. Database composition roots only order and record those module-owned lifecycle functions.

`npm run db:migrate` runs migrations without application seeders. `npm run db:seed` ensures migrations and then runs seeders. Tenant setup and reinstall preserve existing data, run every selected migration first, then run every selected seeder repeatably.

For production, run during the approved release window and keep logs with the release record.

## Failure Handling

- Stop the rollout.
- Preserve logs and failed migration status.
- Do not edit an already-applied migration.
- Add a corrective forward migration unless the approved rollback plan says otherwise.
- Re-run preflight before retrying.
