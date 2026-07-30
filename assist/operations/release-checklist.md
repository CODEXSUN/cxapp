# Release Checklist

## Before Release

- Confirm product version.
- Confirm module versions.
- Review changelog.
- Review migration list.
- Verify tenant migration plan.
- Verify backup plan.
- For database changes, run `npm run db:migrations:preflight`.
- For database changes, restore a recent dump locally and run `CODEXSUN_RESTORED_DUMP_TEST=1 npm run db:migrations:test-local`.
- For production database changes, record `CODEXSUN_VERIFIED_BACKUP_ID` before migration execution.
- For backup readiness, run `npm run db:restore:test` against a sandbox database and then `npm run db:backup:verify`.
- Run test suite.
- Check accounting and billing tests.
- Check offline sync tests if affected.
- Check permission and tenant isolation tests.
- Check background jobs and queues.
- Check desktop build if affected.
- Check mobile build if affected.
- Check integration credentials and environment settings.

## Tenant Safety

- Verify no cross-tenant data access.
- Verify tenant context in jobs.
- Verify tenant context in events.
- Verify tenant-specific settings are preserved.
- Verify backups are available.

## Compliance Safety

- Verify GST calculations where affected.
- Verify invoice numbering where affected.
- Verify e-Invoice flow where affected.
- Verify e-Way bill flow where affected.
- Verify accounting vouchers where affected.
- Verify audit trail where affected.

## After Release

- Monitor logs.
- Monitor queues.
- Monitor failed jobs.
- Monitor sync conflicts.
- Monitor integration failures.
- Monitor customer-reported issues.
- Update support notes.
- Record follow-up improvements.
