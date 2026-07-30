# CODEXSUN

Software makes simple.

## Working Repository

This CODEXSUN CXApp project is owned and developed from:

```text
E:\Workspace\codexsun\cxapp
```

Treat this checkout and its `https://github.com/CODEXSUN/cxapp.git` Git remote as
the current project.
Do not use files, configuration, or assumptions from older CODEXSUN/CXSUN
workspaces outside `E:\Workspace\codexsun\cxapp`.

CODEXSUN is a monorepo foundation for a multi-tenant business application
platform. The current workspace includes the Platform API, Platform web shell,
shared Framework and UI packages, composed Core and Billing business modules,
tenant-owned Mail modules, master database bootstrap, and version/changelog
tooling.

## Start

```bash
npm install
npm run dev
```

The single root command starts the Platform API and Platform web shell together.
Core, Billing, and Mail attach as packages; they have no standalone development
entrypoints.

Install dependencies only from this repository root. All apps, packages, and
tools resolve dependencies from the root `node_modules`; workspace-local
`node_modules` folders are removed automatically and rejected by
`npm run dependencies:check`.

Platform API: <http://127.0.0.1:7010>

Platform web: <http://127.0.0.1:7020>

## Docker Deployment

Docker deployment files live in `.container/`. Shared MariaDB, Redis, and
Media services are installed once alongside the composed Platform API and web
runtime.

```bash
bash prepare-env.sh
bash setup.sh
```

`prepare-env.sh` creates or updates the private `.container/deploy.env` from
`.container/deploy.env.sample`. It never reads or copies the development
`.env`. `setup.sh` only validates the prepared deployment file before applying
the container installation.

A Linux deployment host needs Docker and Compose, but does not need Node.js or
npm installed: environment preparation runs through the declared Docker Node
image when host Node.js is unavailable. Press Enter at a credential prompt to
preserve its existing deployment value.

For a non-interactive host where administrator credentials already exist in
`.container/deploy.env`, run:

```bash
bash prepare-env.sh --non-interactive
bash setup.sh --yes
```

For repeated local deployments, open the cleanup menu before reinstalling:

```bash
bash setup.sh --clean
```

The menu offers application-only cleanup, complete runtime cleanup while
preserving all data, or full local data cleanup including MariaDB, Redis, File
Browser, application storage, named volumes, and the CODEXSUN network. Docker
build-cache pruning is a separate optional choice.

On Windows, use Git Bash explicitly when `bash` resolves to WSL but no Linux
distribution is installed:

```powershell
& "C:\Program Files\Git\bin\bash.exe" setup.sh
```

After pulling or copying an updated checkout, validate the existing deployment
without changing it:

```bash
bash update.sh --check
```

Apply a guarded source update interactively, or use `--yes` on an automated
deployment host:

```bash
bash update.sh
bash update.sh --yes
```

MariaDB is exposed at the host binding and port declared in
`.container/deploy.env`. Root `.env` is development-only; container setup,
updates, migrations, and smoke checks read only `.container/deploy.env`. Normal
updates preserve configuration, credentials, databases, uploads, and named
volumes. The updater verifies Compose ownership before any build, creates a
validated MariaDB backup before migration, replaces only `cxapp-api` and
`cxapp-web`, runs the complete deployment smoke test, and restores the previous
application images if replacement fails. See `.container/README.md` for the
full port map, registry flow, persistence contract, and verification commands.

## Workspace

```text
apps/platform/api
apps/platform/web
apps/core/api
apps/core/web
apps/billing/api
apps/billing/web
apps/mail/api
apps/mail/web
packages/framework
packages/ui
tools/version
assist
```

## Strict UI/Form Guardrails

Before changing tenant/common/master forms, relation lookups, switch cards, placeholders, or shared form controls, read:

```text
assist/devops/ui-form-regression-guardrails.md
```

Required commands:

```bash
npm run check
npm run build
```

Use the root checks before finishing shared UI, lookup, common module, or master
module work.

## Strict App Module Shape

Business apps keep backend and frontend modules paired:

```text
apps/billing/api/src/modules/sales
apps/billing/web/src/modules/sales
apps/billing/web/src/shared
```

Backend modules must use the complete behavior-bearing file contract in `assist/architecture/module-boundaries.md`.

Frontend full modules use `index.ts`, `sales.workspace.tsx`, `sales.list.tsx`, `sales.form.tsx`, `sales.services.ts`, `sales.hooks.ts`, `sales.types.ts`, `sales.schema.ts`, and `sales.spec.ts`, with settings/print files when those capabilities exist. Alias-only wrappers and empty role files are forbidden.

Use `web/src/shared` only for cross-module web code; module-specific screens stay under `web/src/modules/{module}`.
