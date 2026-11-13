# DevKit retirement: first stage

The first stage removes the super-admin Platform Registry screen and stops registering DevKit API routes. A visit to the old super-admin path falls back to the overview; old API calls receive the normal not-found response. DevKit database migrations, seed behavior, packages, existing registry records and stored tables remain in place for compatibility and rollback. No data is dropped. This stage does not remove the DevKit packages from build artifacts.

Before release, inventory consumers of `/api/devkit/` and `/devkit/`, including external integrations, and notify affected operators. The route removal is an intentional compatibility break. Back up and verify restoration of the full master database and application configuration. Test the release against a restored production copy, including multiple tenants and API clients, then deploy using the guarded updater and verify tenant login, routing, business workflows and health. Record the existing image IDs and retain the prior release and backup.

If rollback is needed, restore the previous application images and configuration using the deployment procedure. The retained DevKit data is available to the prior release; reconcile any changes made after the backup before restoring a database. Image rollback alone does not roll back database changes.

A later release can remove the DevKit workspace packages, startup migration and seed hooks, build dependencies and stale app-registry entry after verifying the migration ledger and all consumers. Preserve the migration history. Drop DevKit tables or registry records only as a separate reviewed cleanup after the rollback window and another verified backup; do not drop the shared master database.
