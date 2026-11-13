# Add-on retirement migration plan

Status: design only. The replacement, migration tooling, and deployment checks described here do not yet exist. Do not drop databases, tables, users, files, or credentials based on this document alone.

## Goal and boundaries

Retire the external File Manager and Blog packages from CXApp while retaining existing data and tenant access. The built-in Storage Manager already uses `storage/<tenant-key>/public` and `storage/<tenant-key>/private`. A local empty File Manager database is not evidence that production is empty. Blog has tenant-scoped data and public routes; removing its package also removes its editor and API unless replacements are provided.

## 1. Inventory and backups

- Record the deployed commit, image IDs, configuration names, tenant IDs and keys, active add-on versions, and health. Never include secret values in logs or the migration report.
- For every tenant, inventory File Manager folders, files, external links, provider types and connections, and Blog records and referenced media. Identify the mapping from add-on tenant scope to the authoritative tenant key; stop on missing or ambiguous mappings.
- Identify local object roots and remote providers. Plan an explicit supported destination for each provider, link and object; do not assume all objects are local or publicly accessible.
- Create and verify a restorable full MariaDB backup, including the File Manager database and all tenant databases. Independently back up local objects and provider configuration, and verify the backup includes the encryption key required to recover encrypted credentials. Keep secrets in protected backup storage.
- Test restoration to an isolated environment and compare counts and representative content. Do not proceed if backup or inventory is incomplete.

## 2. Prepare a compatible release

- Implement replacement storage APIs and UI, tenant authorization, public/private access controls, and any Blog functionality that must remain available. Preserve existing links or provide explicit redirects and compatibility mappings.
- Fix the tenant public storage link so it cannot serve a tenant's private directory; test existing public URLs and deny access to private paths, including traversal and symlink cases.
- Provide an idempotent, resumable migration with a dry run. Copy rather than move objects to tenant-scoped destinations, preserve visibility and ownership, validate paths, handle naming collisions without overwriting, and record a durable old-to-new mapping and per-item outcome.
- Migrate metadata, folders, external links and provider references as supported by the replacement. Fail closed and report unsupported providers or records; retain the original data until every item has a verified destination. Migrate Blog data and URLs to the agreed replacement before retiring its routes.
- Validate file checksums and sizes, record counts, tenant isolation, authorization, links, and representative Blog pages in a production-like restored environment. Repeat the migration and verify it does not duplicate or overwrite data.

## 3. Cut over

- Schedule a maintenance window or implement a tested write freeze/dual-write strategy. A one-time copy while writes continue is not sufficient. Freeze add-on writes before the final incremental sync and record the checkpoint.
- Take fresh verified database and object backups, run the migration preflight, perform the final sync, and reconcile every tenant and record. Abort if counts, checksums, authorization, or provider mappings differ.
- Build and deploy the reviewed release using the existing guarded updater. Its SQL backup and image rollback do not restore migrated data or object storage; retain the independent backups. Set its migration compatibility flag only after verifying expand-contract compatibility with the running version.
- Verify API and web health, tenant isolation, representative private and public file reads, uploads, downloads, and Blog routes. Restart and repeat persistence checks. Keep old databases, credentials, objects and previous images during the rollback window.

## 4. Rollback

- Before cutover, rehearse how to restore the previous images and configuration and switch reads and writes back. Reconcile or preserve writes made after cutover before returning to the old version; never discard them silently.
- If migration or verification fails, stop the cutover. If rollback requires restoring a database or object backup, perform a coordinated recovery using the recorded backup and checkpoint, and verify data and access afterward. Image rollback alone is insufficient.

## 5. Deferred cleanup

Only after the replacement has passed acceptance and the rollback window has ended, separately review the exact obsolete tables, databases, database users, credentials, provider configuration and files. Confirm no remaining references and take another verified backup. Generate explicit, narrowly scoped cleanup commands with a dry run and a recovery plan before executing any drop or deletion. Do not drop shared tenant databases or shared service volumes.
