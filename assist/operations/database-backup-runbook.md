# Database Backup Runbook

## Purpose

Use this runbook to create, verify, and restore CODEXSUN platform and tenant database backups.

## Backup Schedule

| Backup type                            | Frequency                         | Retention                   |
| -------------------------------------- | --------------------------------- | --------------------------- |
| Platform full backup                   | Daily                             | 30 days                     |
| Tenant full backup                     | Daily                             | 30 days                     |
| High-volume tenant incremental or PITR | 15 minutes to 1 hour              | 7 to 30 days                |
| File storage backup                    | Daily                             | 30 days                     |
| Pre-migration backup                   | Before every production migration | Through rollback window     |
| Monthly archive backup                 | Monthly                           | 1 year or compliance policy |

## Restore Test

1. Choose a backup artifact.
2. Restore it into a sandbox database, never a live platform or tenant database.
3. Set `CODEXSUN_RESTORE_TEST_DB_NAME` to the sandbox database name.
4. Run `npm run db:restore:test`.
5. Validate row counts, login-critical records, tenant registry records, and affected module totals.
6. Set `CODEXSUN_BACKUP_VERIFY_ID` to the backup artifact or run id.
7. Run `npm run db:backup:verify`.

## In-App Queue Flow

1. Super Admin opens Database -> Master Database or Tenant Databases.
2. Backup creates a `database-maintenance.run` job in Queue Management.
3. The database queue worker or the Queue Management Run action creates a local SQL artifact under `CODEXSUN_BACKUP_DIR`.
4. Restore creates a `database-maintenance.run` job that restores the latest completed backup, or the requested backup, into `CODEXSUN_RESTORE_TEST_DB_NAME` when configured.
5. If `CODEXSUN_RESTORE_TEST_DB_NAME` is blank outside production, the app uses `{source_database}_restore_sandbox`.
6. Queue job payload/result details are visible in Queue Management with secret-like fields masked.
7. Live restore is disabled by default. It requires `restoreMode=live`, `liveRestoreConfirm=RESTORE {database}`, `CODEXSUN_ALLOW_LIVE_RESTORE=1`, and `CODEXSUN_LIVE_RESTORE_CONFIRM=ALLOW_LIVE_RESTORE` during an approved restore window.

## Safety Rules

- Encrypt dumps at rest.
- Restrict backup and dump download access to approved operators.
- Audit backup creation, download, restore, verification, and deletion.
- Keep tenant restores isolated from other tenants.
- Do not mark a backup verified until a sandbox restore succeeds.
- In-app restore defaults to sandbox-only. Live restore is implemented behind explicit environment and request confirmations and still requires a separate approved operational window.
