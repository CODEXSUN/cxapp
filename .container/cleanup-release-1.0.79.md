Historical review: current release evidence and deployment gates are in `.container/release-1.0.81-review.txt`.

# Cleanup deployment review — source version 1.0.79

Status: **not ready for production deployment**. This document describes uncommitted local changes based on version 1.0.79, not a released artifact. The live VPS was last inspected at version 1.0.79, commit `85c3ad2`; recheck before any deployment. Assign a new release version and identify its exact committed source and image digests using the repository release process. Reusing 1.0.79 would make old and new images hard to distinguish and is not recommended.

## Changes under review

- DevKit: the super-admin workspace and API route registration are removed, but DevKit packages, database migrations, seed logic, app registry entries, proxy configuration and deployment build inputs remain. Existing API consumers will lose access. No DevKit data migration or drop is included.
- Design System: the super-admin component gallery is removed. Shared UI components and design preferences remain.
- Task Manager: the super-admin screen is removed and API calls authenticated as super-admin are rejected. Tenant routes, permission checks and tenant data remain. Existing super-admin tasks remain in the master database but are no longer accessible through this API; restore the prior release to recover that access. Do not delete these records.
- Blog and File Manager retirement is not implemented. The proposed tenant-storage public-link security correction is not included. Neither should be assumed to be part of this release.

## Release blockers

1. Run the updated `tools/e2e/composed-platform-runtime.e2e.ts` against an isolated production-like restored environment. It now checks that DevKit is absent from health and its API returns 404, that tenant Task Manager lookups work, and that super-admin access is rejected. Confirm no external DevKit consumer requires the old endpoint.
2. Add and run integration checks for tenant Task Manager isolation across at least two tenants, disabled-module and permission-denied cases. Confirm existing super-admin tasks are retained. Verify super-admin navigation and old URLs, including fallback behavior.
3. Complete a full clean build, relevant end-to-end tests, and deployment smoke checks against an isolated production-like restored database and storage copy. Review all pre-existing uncommitted changes, including package and lockfile edits, and establish exactly which changes belong to the release.
4. Verify migration compatibility and rollback from the exact release candidate. The `CXAPP_MIGRATION_COMPATIBLE_VERSION` guard must only be set to the release version after expand-contract compatibility is established. Do not modify migration history or drop DevKit or Task Manager data as part of this release.

## Before deployment

- Inventory external DevKit callers and notify affected operators; the API removal is a breaking change.
- Identify tenants using Task Manager and check their permissions. Determine whether super-admin users need an export of their tasks before access is removed.
- Record the currently deployed commit, image IDs, health, configuration and a rollback owner. Preserve the existing deployment environment and secrets. Do not expose credentials in logs or release notes.
- Take a full MariaDB backup covering master and all tenant databases and independently back up persistent files and relevant configuration. Verify checksums and a restore in isolation; confirm adequate disk space. The updater's SQL backup does not cover all filesystem and external storage data.
- After placing the exact reviewed release on the host, run `bash update.sh --check` and resolve every failure. The updater requires clean source by default, matching version/image settings, and the migration compatibility guard. Do not use `--allow-dirty` for a routine release.

## Deploy and verify

Use the documented guarded `bash update.sh` procedure, with the release-specific settings prepared beforehand. Check the updater's backup and deployment record and confirm the API and web containers are healthy. Verify super-admin login, old and current navigation, tenant login and isolation, Task Manager for enabled and disabled tenants, file and media access, and core Billing and Mail workflows. Confirm DevKit endpoints are unavailable as intended. Restart and repeat persistence checks. Monitor application logs and client reports during the rollback window.

## Rollback and cleanup

Retain the previous application images, environment, database backups, persistent files and deployment record. The updater attempts image restoration on replacement failure but does not reverse applied migrations or restore files. For a later rollback, follow the documented recovery procedure, preserving or reconciling writes made after cutover before restoring any database or file backup. Validate tenant workflows after recovery.

Do not drop DevKit tables, super-admin task rows, databases, accounts, volumes, or files in this release. Any later deletion requires a separate inventory, verified backup and restore test, explicit scoped migration, and a rollback/retention decision.
