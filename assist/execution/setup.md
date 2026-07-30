# CODEXSUN Billing Deployment Setup

Last reviewed: 2026-07-15.

The active `.container/` deployment contains only four independent stacks: MariaDB, Redis, Media, and Billing.

Billing owns the current deployable business release boundary:

- `@codexsun/framework`
- Platform API/Web
- Core API/Web
- Billing API/Web

## Prepare private input

```bash
bash .container/prepare-env.sh
```

The ignored `.container/deploy.env` is the deployment input file. Existing values win; missing placeholders are imported from repository `.env` where available, then remaining secrets are generated randomly. Media uses the resolved Super Admin password by default.

If `ENABLE_DEFAULT_TENANT_SEED=1`, setup prepares and validates the complete `DEFAULT_TENANT_*` input before changing containers. It provisions the configured tenant and tenant database repeatably; it does not reset an existing tenant database.

Keep the generated file private and review public URLs before deploy. Production database reset flags must remain disabled. Set `CODEXSUN_VERIFIED_BACKUP_ID` to a verified backup run ID before Billing migrations. A confirmed empty first deployment may use a recorded `initial-empty-database-YYYYMMDD` marker, but that marker must never be reused against an existing database.

## Install or reinstall the complete stack

```bash
bash .container/setup.sh
```

Clean reinstall, preserving every database and named volume:

```bash
bash .container/setup.sh --reinstall
```

`setup.sh --reinstall` replaces containers and images only. It never deletes volumes or calls database reset/drop operations.

## Deploy or reinstall Billing only

```bash
bash .container/deploy.sh billing up
bash .container/deploy.sh billing --reinstall
```

The Billing command never modifies MariaDB, Redis, or Media lifecycle state. It builds one shared API image, one shared web image, and one migration image; checks and applies forward Platform/Core/Billing migrations; prints the applied migration ledger; then starts the six application containers. Existing databases and storage volumes are preserved.

## Growth rule

Accounts work remains inside Core/Billing and therefore extends the Billing stack without a new deployment project. Create another independent stack only when an app gains a genuinely separate runtime, lifecycle, scaling boundary, and persistent-data owner.

Operational commands, image tags, ports, volume names, media reinstall safety, and troubleshooting are documented in `.container/README.md`.
