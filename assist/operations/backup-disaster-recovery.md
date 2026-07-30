# Backup And Disaster Recovery

## Purpose

CODEXSUN must protect tenant data and recover from failure.

Backups are useful only if restore has been tested.

## Backup Scope

Back up:

- Platform database.
- Tenant databases.
- File storage.
- Tenant configuration.
- Integration configuration without exposing secrets.
- Audit logs according to retention policy.
- Document templates.

## Backup Frequency

Suggested baseline:

- Daily full backup for tenant databases.
- More frequent backups for high-volume or enterprise tenants.
- Point-in-time recovery where infrastructure supports it.
- File storage backup aligned with database backup.

## Baseline Schedule

| Backup type                         | Frequency                            | Retention                   | Verification                        |
| ----------------------------------- | ------------------------------------ | --------------------------- | ----------------------------------- |
| Platform database full backup       | Daily                                | 30 days                     | Weekly restore test into sandbox    |
| Tenant database full backup         | Daily per tenant                     | 30 days                     | Monthly sampled tenant restore test |
| High-volume tenant incremental/PITR | 15 minutes to 1 hour where supported | 7 to 30 days                | Monthly point-in-time restore test  |
| File storage backup                 | Daily                                | 30 days                     | Monthly file restore sample         |
| Pre-migration backup                | Before every production migration    | Through rollback window     | Required before migration preflight |
| Monthly archive backup              | Monthly                              | 1 year or compliance policy | Quarterly archive restore sample    |

## Restore Types

Support:

- Full platform restore.
- Single tenant restore.
- Single database restore.
- File restore.
- Configuration restore.
- Test restore into sandbox.

## Recovery Planning

Define:

- Recovery Time Objective.
- Recovery Point Objective.
- Backup retention.
- Restore owner.
- Customer communication plan.
- Validation checklist.

## Disaster Recovery Rules

- Backups must be encrypted.
- Restore process must be documented.
- Restore should be tested regularly.
- Tenant restore must not overwrite another tenant.
- Production restore needs approval and audit.
- Enterprise tenants may need custom backup schedules.

## Operator Commands

- `npm run db:migrations:test-local` runs migrations only after `CODEXSUN_RESTORED_DUMP_TEST=1` confirms a dump has been restored into local databases.
- `npm run db:restore:test` requires `CODEXSUN_RESTORE_TEST_DB_NAME` and verifies the sandbox restore target is reachable.
- `npm run db:backup:verify` requires `CODEXSUN_BACKUP_VERIFY_ID`; only mark a backup verified after a restore test succeeds.
