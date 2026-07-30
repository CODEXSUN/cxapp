# Changelog

## Version State

Current version: 1.0.42

Release tag: v-1.0.42

Changelog label: v 1.0.42

This changelog starts fresh from the cleaned CODEXSUN foundation. Earlier copied application history was intentionally removed because it did not represent the current workspace.

New entries should keep database-facing work and application code work separate.

#### Database Changes

Records schema, migration, seed, tenant provisioning, and data compatibility changes.

#### App Codebase Changes

Records UI, API, service logic, tooling, packaging, and documentation changes.

## v-1.0.42

### [v 1.0.42] 2026-07-21 11:52 pm - updated dockers

#### Database Changes

- Database update: Yes (auto-check).

#### App Codebase Changes

- Bumped workspace version to 1.0.42.

## v-1.0.41

### [v 1.0.41] 2026-07-21 10:58 pm - Platform Runtime Resilience and Browser Compatibility

#### Database Changes

- Database update: No (runtime transport, process supervision, deployment routing, browser compatibility, tests, and documentation only).

#### App Codebase Changes

- Fixed local login CORS by deriving exact `localhost:7020` and `127.0.0.1:7020` development origins from the canonical Platform Web configuration while retaining exact-origin production enforcement.
- Changed Platform browser API traffic to the same-origin `/api/platform` route and added matching Vite and nginx proxies so live cloud bundles never embed loopback or container-only API addresses.
- Separated development dependency installation from production Web compilation so deployed Vite bundles use production mode.
- Added API-first readiness gates and continuous API/Web health supervision to the combined root `dev` runtime while retaining `dev:api` for backend-only development and `dev:web` for frontend-only development.
- Made the separate `dev:web` startup wait for the configured Platform API health endpoint before launching Vite, preventing transient `ECONNREFUSED` proxy failures when frontend and backend commands start concurrently.
- Normalized empty and non-JSON gateway responses in the Platform browser transport so upstream failures produce actionable availability messages instead of `Unexpected end of JSON input`.
- Added the `Permissions-Policy: unload=*` compatibility response header in Vite and nginx for Chromium browser-extension listeners, including injected frames.
- Added trusted login-preflight and rejected-origin E2E coverage, and verified composed runtime startup, same-origin login routing, browser response headers, module boundaries, dependency layout, TypeScript, lint, and production builds.
- Bumped workspace version to 1.0.41.

## v-1.0.40

### [v 1.0.40] 2026-07-21 1:46 pm - Environment Contract Consolidation

#### Database Changes

- Database update: No (runtime configuration, application wiring, deployment, and documentation changes only).

#### App Codebase Changes

- Consolidated the development and deployment environment contracts so each runtime feature has one canonical variable.
- Removed the duplicate `API_HOST`, `PLATFORM_WEB_ORIGINS`, `VITE_PLATFORM_API_URL`, `VITE_TENANT_NAME`, and `VITE_DEV_AUTO_TENANT_LOGIN` environment entries.
- Made `PLATFORM_API_URL` the single internal API endpoint consumed by the Platform server and Vite proxy; browser builds now use the fixed same-origin `/api/platform` route.
- Reused `DEFAULT_TENANT_NAME` and `DEV_AUTO_TENANT_LOGIN` for browser build configuration instead of maintaining frontend-only aliases.
- Reduced the primary runtime block to `NODE_ENV`, `PLATFORM_API_PORT`, `PLATFORM_WEB_PORT`, `PLATFORM_WEB_ORIGIN`, and `PLATFORM_API_URL`.
- Derived local CORS compatibility for equivalent `localhost` and `127.0.0.1` origins from the single configured Web origin.
- Added exact login-preflight coverage, kept unconfigured origins blocked, and routed container/browser API traffic through same-origin nginx and Vite proxies so cloud bundles never embed loopback API addresses.
- Separated development dependency installation from production Vite compilation so live bundles report production mode while retaining all build tooling.
- Added an `unload` compatibility permissions policy to Platform Vite and nginx responses so legacy browser-extension listeners, including injected frames, do not emit Chromium policy violations during the staged deprecation.
- Sequenced the consolidated development startup behind API and Web health gates, made legacy `dev:api` and `dev:web` commands start the complete Platform runtime, and stopped the stack when either owned process exits.
- Normalized empty and non-JSON gateway responses in the Platform browser transport so an unavailable API produces an actionable error instead of an `Unexpected end of JSON input` exception.
- Required published application and infrastructure ports, public URLs, and GSP endpoints to come from deployment environment input while retaining fixed private container implementation ports.
- Updated container build arguments, Compose wiring, preflight startup, smoke checks, examples, and deployment documentation for the consolidated contract.
- Bumped workspace version to 1.0.40.

## v-1.0.39

### [v 1.0.39] 2026-07-21 10:18 am - Unified Platform Runtime and Package Manifests

#### Database Changes

- Database update: No (runtime, tooling, packaging, deployment, and documentation changes only).
- Enabled Billing and Mail by default for newly created tenants and reconciled default-tenant seeds, while retaining explicit per-tenant opt-out controls.

#### App Codebase Changes

- Consolidated application startup into the single root `npm run dev` command, which launches only the Platform API on
  port 7010 and Platform Web on port 7020.
- Converted Core, Billing, and Mail into Platform-composed API/web packages while retaining Framework and UI as shared
  infrastructure packages with explicit ownership boundaries.
- Removed standalone Core and Billing server/Vite entrypoints, obsolete ports 7030 through 7060, the domain gateway,
  product-specific process controls, and stale development environment variables.
- Reduced container, hosted nginx, systemd, CI, smoke-test, and product-stack configuration to the composed Platform API
  and Platform Web deployment.
- Consolidated shared compiler, lint, build, type, Vite, Tailwind, and operational tooling into the root `package.json`;
  workspace manifests now retain only package checks and direct runtime dependency contracts.
- Moved database operations and the sole development command to the root manifest, removed unused dependency declarations,
  transferred UI-owned fonts and editor/style dependencies to `@codexsun/ui`, and regenerated the single root lockfile.
- Added composed Platform runtime E2E coverage and updated persistence and live-mass harnesses to consume the Platform
  composition root instead of standalone product applications.
- Consolidated Platform, tenant runtime, Core, Billing, and Mail migration/seed orchestration into one deterministic
  dependency order while retaining every SQL migration and seeder inside its owning module.
- Split tenant migration from seeding, repaired root database commands that referenced removed workspace scripts, and
  made tenant setup/reinstall run all selected migrations before repeatable seeders.
- Added per-leaf Core migration ledger entries, executed every Billing module seeder, included Platform lifecycle
  policies previously skipped by master bootstrap, and expanded reinstall E2E coverage to verify Mail.
- Updated startup, deployment, app-orchestration, package-management, inventory, and UI verification documentation to
  describe the two-port composed Platform runtime.
- Validated the production container stack locally with Platform API/Web, MariaDB, Redis, Media, the default `codexsun`
  tenant, Billing, Mail, and all administrator login paths; expanded the reusable smoke test to cover these dependencies.
- Consolidated deploy environment preparation for database, super-admin, software-admin, tenant-admin, default tenant,
  and Mail fallback values, while keeping the generated credential file ignored and persistent.
- Fixed the container migration-state command after root manifest consolidation and upgraded jsPDF and Nodemailer to
  patched releases with a zero-vulnerability production dependency audit.
- Added a separate pre-start container runtime refresh command that synchronizes Node and npm from the development
  workspace, pulls and verifies the matching base image, and installs the same npm release in the API runtime image.
- Hardened PDF capture with a bounded render size and disabled Nodemailer filesystem/URL content access while retaining
  the latest compatible jsPDF and Nodemailer releases.
- Added an explicit multi-origin CORS allowlist so container Web access through both `localhost` and `127.0.0.1` can
  authenticate against the Platform API while production deployments retain an exact origin list.
- Bumped workspace version to 1.0.39.

## v-1.0.38

### [v 1.0.38] 2026-07-21 9:26 am - Repository Application Cleanup

#### Database Changes

- Database update: No (manual).

#### App Codebase Changes

- Removed the complete B2B Connect and Ecommerce application boundaries, including API/web workspaces, public pages,
  authentication and profile modules, container projects, deployment composition, routes, menus, environment values,
  package dependencies, generated output, and active documentation references.
- Removed the complete Data Bridge and Kitchen Serve application boundaries, including their migration/reconciliation
  and service-order modules, Platform desk/orchestration integration, development and preflight services, runtime ports,
  deployment stubs, workspace packages, local JSON runtime stores, generated artifacts, and active documentation.
- Removed the complete Sites application boundary and all CODEXSUN, LogicX, and Tech Media client implementations,
  media assets, Vite workspace, development/domain routes, product-stack contract, static container project, hosted
  publishing configuration, environment values, release tags, build output, and active architecture references.
- Reduced the active repository to Platform, Core, Billing, and Mail with eleven npm workspaces, one Billing product
  release contract, and one container deployment composed from Billing plus the persistent MariaDB, Redis, and Media
  infrastructure layer.
- Cleaned root scripts, module-boundary registration, app orchestration, package manifests, the root lockfile, environment
  templates, Docker helpers, hosted nginx guidance, repository inventory, deployment documentation, caches, and root
  production output so removed applications are not part of active source or generated artifacts.
- Updated the supported development baseline to Node.js 26.5.0, npm 12.0.1, and TypeScript 7.0.2 while retaining npm
  as the sole root workspace package manager and preserving a single root dependency tree and build-output directory.
- Verified a clean npm installation, module ownership boundaries, the reduced product-stack contract, TypeScript, ESLint,
  production builds, dependency layout, version alignment, shell syntax, diff integrity, and active-source/generated-output
  trace scans after the cleanup. Database-backed and live-browser E2E suites were not part of this cleanup verification.
- Bumped workspace version to 1.0.38.

## v-1.0.37

### [v 1.0.37] 2026-07-19 1:39 pm - Billing-First Public Product Experience

#### Database Changes

- Database update: No (manual).

#### App Codebase Changes

- Removed the Sites application, its three public-site clients, static assets, workspace package, development commands,
  product-stack contract, container image/Compose project, hosted publishing rules, and environment/deployment entries.
- Bumped workspace version to 1.0.37.
- Repositioned the Platform-owned public application site around a billing-first product story covering quotations,
  invoices, GST-ready document preparation, e-way bills, e-invoices, sales, purchases, receipts, payments, ledgers,
  receivables, reports, and digital document history.
- Rewrote Home, Billing, Features, Security, Blog, Updates, About, Contact, Privacy, and Terms with practical content for
  billing staff, accounts teams, business owners, new-employee onboarding, responsibility changes, and staff handovers.
- Removed tenant-architecture, multi-tenant, multi-company, and industry-pack marketing language from the rendered public
  experience while retaining the existing backend-driven brand, theme, login, and connected-site contract.
- Added reusable billing editorial data for invoice, compliance, accounts, monitoring, automation, handover, and digital
  documentation stories without moving application business behavior outside its owning modules.
- Added colour-coded billing and accounts cards, animated live-status indicators, rotating control rings, document-flow
  interactions, responsive hover states, and reduced-motion-safe fallbacks.
- Limited AI and maintenance messaging to supporting concerns: reviewed assistance for repetitive preparation and
  unobtrusive background processing for exports, integrations, documents, and service operations.
- Added a CODEXSUN fallback brand for an unconfigured local public portal while preserving configured organisation branding.
- Verified formatting, Platform Web lint and TypeScript, Platform module boundaries, root dependency layout, version
  alignment, production build output, all public routes, billing-language exclusions, and desktop/mobile rendering.

## v-1.0.36

### [v 1.0.36] 2026-07-19 - Billing-First Public Product Story

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Reworked the complete public application site around invoicing, e-way bills, e-invoices, accounts, live monitoring,
  staff controls, handovers, workflow accuracy, and digital documents.
- Removed tenant-architecture, multi-tenant, and industry-pack language from customer-facing copy while preserving the
  existing backend-driven branding and application entry contract.
- Added colour-coded billing content, animated document-flow cues, live status accents, and reduced-motion-safe
  interactions across the public pages.
- Kept maintenance and AI as supporting product concerns rather than the primary marketing story.

### [v 1.0.36] 2026-07-19 - Rich Tenant Product Experience

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Upgraded the tenant-aware public application site with richer product storytelling, tenant-derived workspace previews,
  progressive-growth journeys, operational outcomes, editorial blog presentation, release guidance, support preparation,
  page-owned FAQs, and expanded privacy and terms content.
- Added and wired a dedicated `/security` page covering domain-based tenant resolution, authenticated access, role and
  permission scope, tenant database routing, audit expectations, and evidence-based assurance without unsupported
  certification claims.
- Expanded the shared tenant-site visual system with responsive product-preview, security-model, capability, growth,
  editorial, FAQ, assurance, and legal content blocks while preserving the tenant portal module as the only public data
  contract.

### [v 1.0.36] 2026-07-19 - Tenant-Aware Public Application Pages

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Refactored the Platform tenant home into an extensible public application-site composition with tenant-aware context,
  shared navigation and footer blocks, landing sections, and a reusable page template under `src/public/tenant-site`.
- Added and wired public Workspace, Features, Blog, Updates, About, Contact, Privacy, and Terms pages. Every page resolves
  the current tenant's domain branding, theme, content, login route, and connected public-site URL through the existing
  tenant portal read contract.
- Expanded the application footer into standard Workspace, Company, and Application navigation groups without coupling
  the app-owned public pages to the separate Sites application.

### [v 1.0.36] 2026-07-19 - Platform Tenant Home Public Ownership

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Moved the tenant-facing Platform home page and its page stylesheet from the tenant portal module into
  `apps/platform/web/src/public`, while keeping tenant portal data access and types owned by the module.
- Updated the `/` route to lazy-load the new `public/tenant-home.tsx` entry directly.

### [v 1.0.36] 2026-07-19 - Platform Dashboard Home Correction

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Corrected the shared dashboard Home action to return to the Platform root on the current app origin. Local access
  from `http://127.0.0.1:7020` now returns to `http://127.0.0.1:7020/` instead of the public Sites hostname.

### [v 1.0.36] 2026-07-19 - Dashboard Header Actions

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Removed the unused desk-tools suitcase control and the hardcoded notification count from the shared dashboard top
  bar.
- Dashboard Home now resolves the tenant-configured public site with the deployed Codexsun public-site origin as its
  fallback, and top-bar Logout now closes the active desk session before returning to its login page.

### [v 1.0.36] 2026-07-18 10:52 pm - Warm-Cache Tenant Reinstall Repair

#### Database Changes

- Database update: No new schema definition. Existing tenant databases can be repaired through the same managed
  setup/reinstall path.
- Core and Billing maintenance lifecycles now invalidate only the target tenant's in-process bootstrap state before
  rerunning their owned migrations and repeatable seeds. This restores the complete selected-app schema even when the
  database was dropped or recreated while the Platform API remained running.

#### App Codebase Changes

- Tenant app composition now calls the forced Core and Billing tenant migration contracts for every managed setup,
  reinstall, safe migration, tenant save/update, and database CLI migration.
- Expanded the bootstrap E2E to warm both app caches, drop the tenant database, run Re-install in the same process,
  and verify the complete 20-migration Billing schema is rebuilt with no running maintenance rows.

### [v 1.0.36] 2026-07-18 10:32 pm - Selected-App Tenant Provisioning Lifecycle

#### Database Changes

- Tenant creation, update, setup, reinstall, safe migration, and database CLI migration now apply the selected app
  lifecycle in dependency order: Platform tenant foundation first, Core prerequisites before Billing, Billing-owned
  migrations and repeatable seeds next, and Mail only when Mail is enabled.
- Billing-selected tenants now receive the complete 20-row migration ledger and all Core/Billing tables during the
  initial tenant save instead of stopping at the Platform/Mail foundation.
- Database maintenance operations now complete or fail their original run row. The Platform migration removes the
  historical duplicate `running` row when its exact matching terminal row was written at the same timestamp.
- Existing tenant data is preserved. Re-running the tenant migration is required to install missing selected-app
  tables in already-created tenant databases.

#### App Codebase Changes

- Added public Core and Billing tenant database lifecycle exports and a Platform composition sequence that consumes
  module-owned migrations without moving schema behavior out of the owning applications.
- Tenant database migration plans now include the complete selected-app plan, so pending migration status reflects
  Core, Billing, and Mail requirements rather than Platform foundation migrations alone.
- Expanded the bootstrap E2E to create a Billing-selected tenant through the same Tenant Service save path, verify all
  required tables and 20 migrations, confirm Mail remains uninstalled when not selected, and validate both run
  finalization and legacy-run reconciliation across restart.

### [v 1.0.36] 2026-07-18 10:09 pm - Tenant App Selection Cards

#### Database Changes

- Database update: No. Tenant app activation continues to use the existing registry and tenant connection contracts.

#### App Codebase Changes

- Reworked Tenant app-selection cards in both show and upsert flows with the established three-column tile layout,
  app-specific icons, Enabled/Disabled status pills, descriptions, and top-aligned activation switches.
- Kept the Application connection visibly enabled and locked, preserved landing-app selection and save behavior, and
  added an iconless option to the shared workspace status badge for compact card statuses.

### [v 1.0.36] 2026-07-18 9:59 pm - Established Login Experience Restored

#### Database Changes

- Database update: No. Authentication persistence and API contracts are unchanged.

#### App Codebase Changes

- Restored the established shared `AuthLayout` experience for `/login`, `/sa/login`, and the shared admin login route,
  including the CODEXSUN brand mark, desk-specific badge, design-system fields, submit button, loading state, and error
  presentation.
- Removed the replacement public-site login markup, tenant-portal branding request, cross-login links, and its obsolete
  page-specific stylesheet without changing login submission, development auto-login, or post-login destinations.

### [v 1.0.36] 2026-07-18 9:40 pm - Same-Origin Core and Billing API Routing

#### Database Changes

- Database update: No. This fix changes browser-to-API routing only.

#### App Codebase Changes

- Replaced browser-facing loopback Core and Billing API URLs with same-origin `/api/core` and `/api/billing` gateway
  paths so Platform works from `127.0.0.1:7020`, `app.codexsun.test`, tenant app domains, and `app.codexsun.com` without
  CORS exceptions.
- Added Core and Billing proxying to their local Vite entry points, the Platform Vite server, and the hosted nginx
  Platform server while preserving existing tenant authorization and database-context headers.
- Added hosted Core and Billing API systemd units and deployment commands required by the production API proxies.
- Documented same-origin Platform/Core/Billing API routing and hosted verification commands.

### [v 1.0.36] 2026-07-18 2:40 pm - Marketing and Tenant App Portal Separation

#### Database Changes

- Database update: No schema or seed migration. Tenant-specific portal content uses the existing tenant-owned
  `payload_settings` JSON column under the validated `appPortal` key.

#### App Codebase Changes

- Removed the Platform web dependency, TypeScript alias, lazy imports, and root marketing routes for
  `@codexsun/sites-web`; Platform and Sites now build and run without importing each other.
- Kept the existing CODEXSUN marketing site under Sites and routed its application, status, and login links through
  `VITE_PLATFORM_WEB_ORIGIN`, targeting `app.codexsun.com` in production.
- Added a responsive Platform app portal at `/` with shared tenant-aware navigation, animated slider, feature cards,
  update/blog cards, public-site return link, workspace login actions, and footer.
- Added the validated public `/public/app-portal` API projection with domain resolution, canonical default-tenant
  fallback, safe URL handling, bounded content, and no exposure of raw tenant settings or database credentials.
- Added an App portal tab to tenant upsert for per-tenant brand, theme, hero, slider, features, updates, footer, and
  optional marketing-site content while preserving unrelated tenant payload settings.
- Added `app.codexsun.test` to the local domain gateway, removed the old `aaran.test` root-to-login redirect, and
  documented the local-to-live domain mapping for `app.codexsun.com` and `app.tenant.com`.
- Updated hosted environment and architecture guidance with `PLATFORM_PUBLIC_SITE_ORIGIN`, strict Sites/Platform
  ownership, tenant-domain registration, and production publishing behavior.
- Verified Platform API/web and Sites lint, TypeScript, module boundaries, all production builds, desktop/mobile app
  portal rendering, tenant-safe API fallback, and preservation of the CODEXSUN marketing homepage.

### [v 1.0.36] 2026-07-18 10:23 am - Client Sites and Domain Routing

#### Database Changes

- Database update: No (manual). No tenant, tenant-domain, migration, seed, or tenant-database record was created or changed in this release.

#### App Codebase Changes

- Added the dedicated `apps/sites/web` workspace with independently owned CODEXSUN, LogicX, and Tech Media public-site clients and separate production artifacts under `dist/apps/sites/web/{client}`.
- Moved the CODEXSUN creator site out of Platform public source while retaining temporary Platform composition through the Sites public export for local root-route compatibility.
- Adapted the Interfrozt frontend into the CODEXSUN identity without redesigning its visual foundation, including refined navigation, animated hero messaging, product sections, enterprise presentation, outcome content, compact page rails, and responsive public layouts.
- Reworked Selected Work into a compact project grid with independently presented CODEXSUN Platform, Billing Suite, and Zero case material, while removing the obsolete Project Overview presentation.
- Added independently branded LogicX and Tech Media sites that reuse only visual infrastructure and retain concrete client-owned content, routes, metadata, and themes.
- Added temporary root development commands for CODEXSUN, LogicX, and Tech Media on ports `7130`, `7131`, and `7132`, plus a combined `npm run dev:sites:all` launcher.
- Added the local port-80 development domain gateway for `codexsun.test`, `logicx.test`, `techmedia.test`, and the `aaran.test` Platform tenant workspace, including Vite WebSocket forwarding and preserved tenant host headers.
- Changed Platform development API access to the same-origin `/api/platform` path so tenant-domain resolution receives the browser hostname instead of the loopback API hostname.
- Expanded the hosted nginx baseline to publish `codexsun.com`, `logicx.in`, and `techmedia.in` from independent Sites artifacts while serving `app.codexsun.com` and registered tenant domains from Platform.
- Updated deployment, project inventory, environment, build, DNS, certificate, and hosted publishing documentation for the new Sites and domain topology.
- Verified formatting, Platform and Sites lint and TypeScript, module boundaries, dependency layout, local hostname routing, same-origin Platform API health, and Platform plus all three Sites production builds.
- Bumped workspace version to 1.0.36.

## v-1.0.35

### [v 1.0.35] 2026-07-17 8:54 am - Billing and Business Services Planning

#### Database Changes

- Database update: No. This release changes product planning, release history, and lockstep package versions only; tenant and Platform schemas remain unchanged.

#### App Codebase Changes

- Added the dated Billing, Accounting, Compliance, and Business Services plan under `assist/execution/planning.md`.
- Recorded the live Billing and Core capability inventory, current readiness limitations, and the prioritized GST, bookkeeping, audit, receivable/payable, purchase-automation, and commercial-document roadmap.
- Defined module ownership boundaries for Billing documents, Accounting books, Compliance workflows, reporting read models, and asynchronous integrations so future work does not become a centralized business engine.
- Added adjacent client-service plans for collections, virtual CFO, loan readiness, payroll, TDS, inventory control, CRM, industry packs, digital commerce, document automation, migration, and managed back-office operations.
- Added commercial packages, launch sequencing, client-acquisition offers, positioning messages, compliance wording, delivery gates, and measurable success criteria.
- Bumped workspace version to 1.0.35.

## v-1.0.34

### [v 1.0.34] 2026-07-15 11:13 pm - Billing Address and Date Picker Reliability

#### Database Changes

- Database update: Yes. Added tenant-owned `mail_settings`, `mail_messages`, `mail_attachments`, and `mail_events` tables with repeatable migrations and permission seeding.
- Mail credentials are encrypted before tenant persistence; message, attachment, provider, and delivery state remain inside each tenant database.

#### App Codebase Changes

- Added the standalone Mail API/web workspaces with Inbox, Outbox, Drafts, Scheduled, Sent, Failed, Trash, rich compose, attachments, tenant SMTP plus IMAP/POP3 settings, environment fallback, and responsive three-column navigation.
- Added tenant-aware queue processing for SMTP delivery and inbound synchronization with idempotency, retry/backoff, delivery events, failed-message visibility, and environment credential fallback.
- Wired Sales, Quotation, Purchase, and Export Sales email tools to capture their rendered document as a PDF, prepare a branded rich message, and enqueue delivery through Mail's public contract.
- Corrected Quotation address and compliance presentation by exposing the document date in the list and resolving customer GSTIN plus Billing/Shipping State names and codes for show and print output.
- Added a narrow Core Contact-address create/update contract that preserves sibling addresses and validates the persisted Country, State, District, City, Pincode, and Address Type hierarchy.
- Wired Quotation, Sales, Purchase, and Export Sales address editors through their module-owned Billing lookup routes so an address popup can append a missing address or update the selected address without replacing the Contact or collapsing formatted location lines into Address line 2.
- Added visible Country selection to the Billing and Shipping address editors, retained India as the create default, cleared dependent location values when Country changes, and hydrated edit forms from structured address records.
- Confirmed Receipt and Payment continue to use their structured Contact popup with visible Country and India default behavior.
- Refined the shared workspace date picker with compact Month and Year autocomplete controls, equal fixed-height scrollable lists, narrow aligned dropdowns, ultra-thin scrollbars, single-line options, typed filtering, and full-list display with the current value highlighted whenever either control receives focus.
- Added opt-in presentation controls to `WorkspaceLookup` for compact option rows, dropdown width/class overrides, icon visibility, clearing behavior, and full-list-on-focus behavior without changing existing lookup defaults.
- Verified Core API, Billing API, Billing web, and UI package formatting, lint, TypeScript, production builds, module boundaries, dependency layout, diff integrity, and database-backed Quotation persistence/conversion coverage during the implementation batch.
- Bumped workspace version to 1.0.34.

## v-1.0.33

### [v 1.0.33] 2026-07-14 11:25 pm - Billing Concurrency and Tenant Runtime Hardening

#### Database Changes

- Database update: Yes (automatic repeatable tenant authorization seeds; no schema migration).
- Added module-owned Core and Billing permission seeds that upsert the new view, create, update, delete, lifecycle, and compliance permissions and grant them to each tenant administrator role during lazy tenant bootstrap.
- Existing tenant databases receive the authorization repair automatically on their first Core or Billing bootstrap after deployment; no table alteration or manual data backfill is required.

#### App Codebase Changes

- Consolidated production deployment into four independent MariaDB, Redis, Media, and Billing stacks; Billing now packages Framework-backed Platform, Core, and Billing services.
- Live-tested the complete local Docker deployment, including production migration gating, persistent Billing storage ownership, the Platform public-storage compatibility link, authenticated Redis and Media access, and health checks for all six Billing services.
- Split complete-stack lifecycle into non-destructive `setup.sh` install/reinstall commands and a Billing-only `deploy.sh`; Billing reinstall now replaces only application containers/images, applies forward migrations, reports the migration ledger, and cannot manage infrastructure or remove database volumes.
- Added repeatable default-tenant deployment inputs, persistent tenant-storage mapping, and setup-time MariaDB grant reconciliation; live install, full reinstall, and Billing-only reinstall preserve the `1:1:19:1` master/tenant migration-and-user signature while all endpoints remain healthy.
- Finalized the deployment lifecycle commands: `.container/setup.sh` installs the complete stack, `.container/setup.sh --reinstall` rebuilds every stack without deleting named volumes, and `.container/deploy.sh billing --reinstall` replaces only Billing backend/frontend containers and images while leaving MariaDB, Redis, and Media untouched.
- Added pre-teardown configuration validation, infrastructure health checks, forward-only migration execution, and applied migration-ledger reporting. Database fresh/reset flags remain prohibited and neither reinstall path contains database-drop or volume-removal operations.
- Added an ignored deployment input workflow that preserves explicit operator values, imports matching secrets from repository `.env`, generates missing random credentials, and synchronizes the Media administrator with the resolved Super Admin password.
- Replaced per-app duplicate images with one shared Billing API image, one shared Billing web image, and one explicit Platform/Core/Billing migration image, leaving room for Accounts modules to extend the same release boundary.
- Added concurrent Sales invoice reservation recovery: conflicting create or draft-update requests save with the next configured number and return a user-visible warning, while the persisted next-number setting advances atomically.
- Added retry-safe document line numbering across Quotation, Sales, Purchase, Export Sales, Payment, and Receipt to prevent simultaneous same-tenant inserts from failing on line-number collisions.
- Serialized Payment and Receipt allocation validation with row locks and deterministic lock ordering so two users cannot allocate the same outstanding Purchase or Sale balance.
- Enforced tenant role permissions for Core and Billing read, mutation, lifecycle, and compliance requests instead of relying on tenant-token membership alone.
- Limited Core and Billing tenant connection pools, evicted pools after ten minutes of inactivity, and replaced startup-wide tenant migration and seeding with lazy per-tenant bootstrap while retaining the explicit database-stack migration command.
- Added module-owned SQL pagination, server-side search and status filtering, bounded hydration, and accurate totals for Quotation, Sales, Purchase, Export Sales, Payment, and Receipt workspaces; page size is capped at 200 records.
- Extended persistence and five-tenant mass E2E coverage for concurrent Sales numbering, bounded document pages, tenant isolation, authorization seed upgrades, fresh bootstrap, and restart bootstrap behavior.
- Bumped workspace version to 1.0.33.

## v-1.0.32

### [v 1.0.32] 2026-07-14 09:32 pm - Tamil Nadu State Priority

#### Database Changes

- Database update: Yes (automatic repeatable Core seed ordering; no schema migration).
- Kept the fallback `-` State first, made Tamil Nadu the second State with sort order one, and shifted the earlier seeded States down to preserve unique deterministic ordering.

#### App Codebase Changes

- Extended persistence E2E coverage to require `-` first and Tamil Nadu second in the database-backed State lookup order.
- Verified the same ordering in the live tenant database after Core startup reseeding.

### [v 1.0.32] 2026-07-14 09:29 pm - India-First Country Default

#### Database Changes

- Database update: Yes (automatic repeatable Core seed cleanup; no schema migration).
- Removed the `-`/`UNKNOWN` Country seed and made India the first Country seed with sort order zero.
- Reparented the fallback and legacy user-created States plus existing Contact address Country references from the removed Country to India before deleting the obsolete Country row.
- Kept the fallback State, District, City, and Pincode chain valid under India for minimal Contact defaults.

#### App Codebase Changes

- Made new Contact popups resolve their initial India label to the persisted India Country ID in Quotation, Sales, Purchase, Export Sales, Payment, and Receipt while retaining full Country override support.
- Extended tenant persistence E2E coverage for fresh India-first seeds, absence of the hyphen Country, fallback hierarchy validity, legacy State and Contact-address cleanup, and repeatable reseeding.
- Verified the live Sales new-Contact popup starts with India and can be overridden with United States.

### [v 1.0.32] 2026-07-14 09:16 pm - Contact Country Selection

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Added a visible, database-backed Country lookup before State in the Quotation, Sales, Purchase, Export Sales, Payment, and Receipt contact popups.
- Made a Country change clear the dependent State, District, City, and Pincode values so each lower lookup is filtered through one consistent persisted hierarchy.
- Verified in the live Sales popup that changing the default `-` Country to India exposes and selects Tamil Nadu without changing persisted contact data during the test.

### [v 1.0.32] 2026-07-14 09:07 pm - Referenced Contact Address Persistence

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Changed Contact address persistence to update retained addresses in place, preserving IDs already referenced by Quotation, Sales, Purchase, and Export Sales records instead of deleting and recreating them during a Contact edit.
- Added a clear conflict response when an address that is still referenced by a Billing record is intentionally removed.
- Added a tenant-database persistence regression that edits a Contact after its address is referenced by a Quotation and verifies that the address ID remains stable.
- Verified the live Sales contact popup through Chrome, the Core and Billing production builds, module boundaries, dependency layout, and the complete tenant-isolated Billing persistence E2E.

### [v 1.0.32] 2026-07-14 08:51 pm - Calm Workspace Data Loading

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Replaced animated workspace table and lookup skeletons with plain loading states so initial data requests no longer shimmer or fade the surrounding interface.
- Kept the last settled table rows visible while Company, Contact, Product, and Work Order searches request their next server-filtered result, preventing table collapse and flicker during typing.
- Applied the plain table-loading state across Core, Platform, and Billing workspaces through the shared workspace table primitive and the remaining module-owned custom tables.

### [v 1.0.32] 2026-07-14 06:37 pm - Company Billing Compliance Bootstrap

#### Database Changes

- Database update: Yes (automatic tenant migration).
- Added company-scoped Billing settings keyed by Company inside each tenant database, with a one-time compatibility fallback that copies the existing tenant-wide Billing setting into a Company's first settings row.
- Added Purchase-owned E-way and E-invoice JSON columns so supplier compliance references persist with each Purchase.

#### App Codebase Changes

- Added `None`, `E-way only`, and `E-invoice + E-way` GST API modes and synchronized the Billing switches so E-invoice cannot be enabled without E-way.
- Wired the saved Company mode to show or omit E-way and E-invoice tabs in Sales, Purchase, and Export Sales, and enforced the same capability checks on Sales and Export Sales generation endpoints.
- Added a tenant startup gate that confirms the authenticated session, loads the enabled tenant apps, resolves the default Company and Financial Year, publishes that context, and preloads Company Billing settings before the first application workspace paint.
- Keyed Billing settings queries and mutations by Company so Company changes cannot reuse another Company's cached feature configuration.
- Verified the Billing migration stack, company setting mode round-trips, module boundaries, dependency direction, lint, typecheck, production builds, and tenant-isolated Billing persistence E2E.

### [v 1.0.32] 2026-07-14 11:47 am - Production Docker Setup Notes

#### Database Changes

- Database update: No (manual).

#### App Codebase Changes

- Added `assist/execution/setup.md` as the production Docker setup helper, documenting the active `.container/` deployment bundle, image build inputs, runtime services, environment requirements, upgrade path, clean reinstall flow, storage, admin tooling, reverse proxy notes, and pre-production checks.
- Recorded the installed Docker image base and runtime packages used by the production build: Node.js 22 Bookworm slim with `ca-certificates`, `curl`, `git`, `mariadb-client`, `nano`, `redis-tools`, and `sudo`.
- Replaced the shared runtime image with independently versioned Platform, Core, and Billing API/Web images plus a dedicated migration runner.
- Split MariaDB, Redis, Pictures, Files, and every application stack into individually deployable Compose projects joined through the external `codexsun-network`.
- Added explicit persistent volumes for database data/backups, Redis, each app stack, picture content/metadata, and file content/metadata; reinstall now preserves all data unless a targeted wipe flag is explicitly enabled.
- Added the Pictures/Files media setup workflow that initializes both File Browser databases and keeps their admin passwords synchronized with `SUPER_ADMIN_PASSWORD` from the repository `.env` without printing the credential.
- Tightened destructive media setup so `--wipe-media` is rejected without `--reinstall`, attached containers are reported before a wipe, and every requested Docker volume removal is verified instead of silently ignoring failures.
- Pinned all upstream Docker bases and aligned CODEXSUN image tags with workspace version `1.0.32`, with no production `latest` tags.
- Bumped workspace version to 1.0.32.

## v-1.0.31

### [v 1.0.31] 2026-07-14 11:08 am - Minimal Billing Draft and Default Reference Fixes

#### Database Changes

- Database update: Yes (manual).
- Updated the Product seed so the protected `-` product resolves its Product Type, Product Category, HSN Code, Unit, and GST Tax foreign IDs from the existing `-` records, falling back to the first active persisted record without creating anonymous masters.
- Updated the Contact seed to resolve the demo contact's persisted Contact Type and Contact Group and to backfill one default `-` address for every active contact that has no address, using the connected seeded Country -> State -> District -> City -> Pincode hierarchy.
- Existing tenant databases require the normal repeatable Core seed pass to receive the Product relationship repair and missing-address backfill; no new table or schema migration is required.

#### App Codebase Changes

- Fixed Quotation, Sales, Purchase, and Export Sales quick-product requests so persisted Product Category, HSN Code, Unit, and GST Tax IDs are submitted as numeric foreign IDs instead of invalid strings.
- Expanded the Core Product response with its resolved type, category, HSN, unit, and GST tax relationship values and made minimal product creation reuse the existing fallback masters.
- Added default-address enrichment to minimal Contact creation so inline contacts created without address details still return a persisted address owned by that contact.
- Aligned the Core Contact Legal Name interaction with the Billing contact popup: leaving Name derives an uppercase Legal Name until it is manually edited, and the magic action restores and refreshes that derived value on demand.
- Allowed contact-only draft creation for Quotation, Sales, Purchase, and Export Sales and zero-value draft creation for Receipt and Payment while preserving line-item requirements for confirmation and positive-total requirements for posting.
- Added fallback Ledger and Work Order resolution for minimal Billing drafts and fallback cash/bank Ledger resolution for Receipt and Payment without creating placeholder business records.
- Extended the tenant-isolated persistence E2E to cover minimal Product and Contact creation, all six minimal Billing draft flows, default foreign-reference resolution, cleanup, and rejection of empty confirmation/posting actions.
- Bumped workspace version to 1.0.31.

## v-1.0.30

### [v 1.0.30] 2026-07-13 11:22 pm - Fresh Database Startup Verification

#### Database Changes

- Database update: Yes (manual).
- Verified migration preflight against the freshly reinstalled `cxsun_master_db` and its registered `codexsun_db` tenant target with no missing or invalid database mapping.
- Ran the complete Platform -> Core -> Billing migration stack successfully and confirmed one applied master migration plus all 19 tenant migration markers, including the five tenant access-control owners and the seven Billing foundations.
- Ran the live seed stack twice without duplicate records or failures, confirming repeatable app-registry, default tenant, domain, subscription, tenant-module, Core, and Billing seed behavior.
- Verified the disposable fresh-start and restart path produces identical persisted state: three platform apps, two plans, one tenant/domain/subscription, two tenant module settings, one `codexsun` company, one current financial year, one default-company setting, one demo supplier, one Billing setting, and all seven Billing root tables.
- Confirmed the default-company seed resolves the first `codexsun` company and current financial year through persisted database identities after a clean installation.

#### App Codebase Changes

- Added independently owned tenant User, Role, Permission, User Role, and Role Permission backend/frontend modules with tenant-bound authorization, migrations, seeders, lifecycle APIs, application-desk pages, and Access Control sidebar composition.
- Added mutation confirmations, success/error notifications, API-aware automatic list return, protected-record handling, and password masking across the tenant access workspaces.
- Split application routes and tenant business workspaces into lazy production chunks; the tenant desk entry chunk decreased from 801.95 kB (139.64 kB gzip) to 37.33 kB (8.80 kB gzip).
- Verified the fresh database startup with `db:migrations:preflight`, `db:migrations:run`, two `db:seed` passes, migration-ledger inspection, and the restart-safe Platform/Core/Billing bootstrap E2E.
- Bumped workspace version to 1.0.30.

## v-1.0.29

### [v 1.0.29] 2026-07-13 4:48 pm - working on sales

#### Database Changes

- Database update: Yes (auto-check).

#### App Codebase Changes

- Bumped workspace version to 1.0.29.

## v-1.0.28

### [v 1.0.28] 2026-07-13 9:52 am - Common List Serial Columns

#### Database Changes

- Database update: Yes (manual).
- Consolidated the fresh Contact migration around the Contact master and its five owned child tables: emails, phones, addresses, bank accounts, and social links.
- Added concrete foreign keys for Contact type/group, address type, location hierarchy, and bank-name references; existing databases require the normal fresh migration path to receive the consolidated schema exactly.

#### App Codebase Changes

- Standardized all 29 Core Common frontend lists so the module-owned `sortOrder` field appears first as a centered `#` serial column with a fixed 64 px width and tabular numeric alignment.
- Preserved strict leaf ownership by keeping the serial-column definition inside each Common list rather than introducing shared or centralized business-column configuration.
- Refactored Core Master Contact into a complete module-owned backend and frontend implementation with exact migration, repository, service, routes, seed, types, list, form, hooks, services, workspace, and index responsibilities.
- Added the animated `Details`, `Tax Details`, `Communication`, `Addresses`, `Finance`, and `More` Contact form tabs with repeatable emails, phones, addresses, bank accounts, and social links.
- Wired Contact Type, Contact Group, Address Type, Bank Name, Country, State, District, City, and Pincode as searchable foreign-reference lookups with in-context creation and dependent location filtering.
- Replaced Contact child JSON read behavior with transactional persistence and hydration through the five Contact-owned child tables, including parent-reference and location-hierarchy validation.
- Verified Contact create-and-read persistence against a disposable freshly migrated tenant database, including one persisted row in every Contact child table.
- Fixed Contact address persistence so a selected country or postal code is retained even when the optional Address line 1 is empty; changing country now persists the new country while clearing stale State, District, City, and Postal Code references in sequence.
- Replaced the India-only six-digit Pincode validation with an international 2-20 character postal-code contract supporting letters, numbers, spaces, and hyphens in both the Common Pincode owner and Contact lookup creation popup.
- Moved Contact next-code generation to the Contact backend using all persisted codes, recognizing both `C-0000` and legacy `C_0001` sequences while returning the canonical next `C-####` value independently of frontend search filters.
- Aligned the Contact postal-code creation popup with the Common Country upsert tone using a compact dialog width, padded header and fields, descriptive copy, footer divider, and consistent primary/cancel action spacing.
- Replaced Product's raw Product Type, Product Category, HSN Code, Unit, and GST Tax ID inputs with Product-owned autocomplete lookups, fixed Common relationship endpoints, create-and-select flows, active-reference validation, and persisted numeric foreign IDs.
- Bumped workspace version to 1.0.28.

## v-1.0.27

### [v 1.0.27] 2026-07-13 8:35 am - rework on core

#### Database Changes

- Database update: Yes (auto-check).

#### App Codebase Changes

- Bumped workspace version to 1.0.27.

## v-1.0.26

### [v 1.0.26] 2026-07-13 1:31 am - Root npm Workspace and Repository Cleanup

#### Database Changes

- Database update: No (manual).

#### App Codebase Changes

- Standardized the monorepo on npm workspaces with one root `node_modules`, one root `package-lock.json`, and no pnpm or Yarn lockfiles, stores, or workspace-local dependency trees.
- Standardized generated build output on the root `dist` tree and removed nested `node_modules`, `dist`, and `dist-types` artifacts and local output configuration.
- Added mandatory Assist governance and agent rules requiring npm commands to run from the repository root and requiring `npm run dependencies:check` plus nested-artifact scanning after dependency, workspace, package, or build changes.
- Removed generated Codex runtime logs, audit output, Turbo and IDE caches, automated test/spec/E2E sources, Playwright configuration, test-runner scripts and dependencies, and the Framework test-only export.
- Updated the module-boundary checker so production module ownership validation no longer requires removed test/spec role files.
- Verified the cleaned repository with npm dependency-tree validation, root dependency-layout validation, Prettier, ESLint, and TypeScript.
- Bumped workspace version to 1.0.26.

## v-1.0.25

### [v 1.0.25] 2026-07-12 10:17 pm - Common Module Boundary and Location Hierarchy

#### Database Changes

- Database update: Yes (manual).
- Rebuilt the Core location foundation migrations as independent Country, State, District, City, and Pincode tables with ordered foreign keys and relationship-safe delete restrictions.
- Added scoped uniqueness for State per Country, District per State, City per District, and Pincode per City.
- Moved Country, Indian State and territory, Tamil Nadu District and City, and supported Pincode seed records into their owning modules with deterministic, idempotent upserts.
- Preserved the ordered Country -> State -> District -> City -> Pincode migration and seed sequence.
- Removed redundant `tenant_id` columns and tenant-scoped indexes from all 24 non-location Core Common master migrations; the selected tenant database is now the sole data-isolation boundary.
- Changed Common master uniqueness from `(tenant_id, primary field)` to database-local primary-field uniqueness and removed tenant prefixes from generated record IDs.
- Existing development databases created from the earlier Common schema require the fresh migration workflow to physically rebuild the tables without legacy `tenant_id` columns.
- Fixed invalid trailing commas after the final unique key in all 24 non-location Common table migrations and quoted the Month `from_date` and `to_date` identifiers for MariaDB compatibility.

#### App Codebase Changes

- Refactored all 29 Core Common leaf modules to the reduced nine-file backend contract: migration, module, repository, routes, seed, service, test, types, and index.
- Replaced all 24 generic Common master wrappers with module-owned migrations, typed records and payloads, direct SQL repositories, validation services, Fastify routes, lifecycle behavior, seeds, and contract tests.
- Removed the Common master definition registry and the shared migration, repository, route, seed, service, context, and type factories; no Common leaf module extends, aliases, or delegates its backend behavior to a generic foundation.
- Removed separate definition, event, sync, and worker placeholder files while preserving each module's fields, protected placeholder rows, seed values, routes, lifecycle behavior, and table ownership.
- Removed Common-level `x-tenant-id` parsing, logical global/tenant row filtering, tenant parameters, and `tenantId` response fields; Common requests now rely exclusively on the fail-closed `x-tenant-db` database context.
- Replaced the former shared location backend with independently owned Country, State, District, City, and Pincode repositories, services, routes, contracts, migrations, seeds, and tests.
- Added normalized Country, State, District, and City relationship joins and parent validation throughout the location hierarchy.
- Added separate Pincode individual and relation endpoints; relation reads return the complete City, District, State, and Country hierarchy.
- Removed obsolete shared location helpers, shared seed data, and the stale legacy location database test that targeted the deleted global/tenant location contract.
- Formatted the complete Core Common backend and verified it with Prettier, ESLint, TypeScript, and Core API tests.
- Rebuilt all 29 Core Common frontend leaf modules as independently owned nine-file bundles: workspace, list, form, services, hooks, schema, types, spec, and index.
- Standardized Contact, Product, Workorder, Other, and Location masters on the Contact Types interaction tone with searchable paginated lists, popup upsert forms, active-state controls, edit, suspend/restore, and force-delete row actions.
- Wired every frontend leaf directly to its owning Core API route through the fail-closed `x-tenant-db` context and removed frontend `tenantId` and `x-tenant-id` handling.
- Consolidated module definitions into each leaf's owned types file and removed the unused shared Location frontend runtime; Common leaf modules no longer borrow or wrap the legacy Common Master or Location implementations.
- Verified the complete Core Common frontend with Prettier, ESLint, TypeScript, 30 passing module specs, a production build, and browser-level Country list and popup-upsert checks.
- Verified the corrected Common migrations through a real configured-database Core API bootstrap through `app.ready` and `server.listen`.
- Added a disposable MariaDB Common E2E regression covering create, restart persistence, read, update, suspend, restore, force delete, response request metadata, and the complete Pincode-to-City-to-District-to-State-to-Country relation read.
- Standardized every Core-owned table primary key on `id INT NOT NULL AUTO_INCREMENT PRIMARY KEY`, including all Common, Location, Master, Organisation Company, and Master child tables.
- Removed persisted and API-facing UUID columns from the complete Core schema and converted Core foreign-key and lookup ID columns to integers.
- Updated Core API repositories, seeds, services, events, sync contracts, Core Web modules, and Platform tenant-desk consumers for numeric record IDs while retaining string conversion only at URL, form-control, and local-storage boundaries.
- Extended disposable MariaDB E2E coverage to assert that every Core table has an integer auto-increment ID, no Core table contains a UUID column, Master child rows receive numeric IDs, relations remain valid, and tenant isolation still passes.
- This is a destructive development-schema change: databases created with string IDs or UUID columns must use the documented fresh migration workflow; existing IDs are not automatically remapped.
- Replaced every Core `is_active TINYINT(1)` persistence column with `status VARCHAR(24) NOT NULL DEFAULT 'active'`, including 24 non-location Common masters and Master social-link child tables.
- Removed the duplicate Master/Company `is_active` column, standardized its existing status column from `VARCHAR(32)` to `VARCHAR(24)`, and changed its tenant-state index to use status.
- Preserved the existing frontend `isActive` interaction contract by translating it to `active`/`inactive` status values in Core repositories; Master suspension continues to persist the explicit `suspend` status.
- Extended MariaDB schema E2E assertions to reject any remaining Core `is_active` column and any status column that is not `VARCHAR(24)` with the `active` default.
- Renamed the Month persistence and application contract from `from_date`/`to_date` and `fromDate`/`toDate` to `start_date`/`end_date` and `startDate`/`endDate`, including seeds, validation, repositories, frontend fields, and labels.
- Removed the unused top-level Core Common sync policy and worker placeholder files after confirming they had no executable imports or exports.
- Corrected the generic Master child-table migration so only Companies and Contacts own address, bank-account, email, phone, and social-link tables.
- Removed obsolete `products_*` and `work_orders_*` contact-detail child tables, stopped child synchronization for Product and Work Order records, and normalized any supplied contact-detail payloads to empty collections.
- Added MariaDB schema assertions requiring all ten Company/Contact child tables while rejecting every Product/Work Order contact-detail child table.
- Bumped workspace version to 1.0.25.

## v-1.0.24

### [v 1.0.24] 2026-07-12 7:34 pm - reworking on full app

#### Database Changes

- Database update: Yes (auto-check).

#### App Codebase Changes

- Bumped workspace version to 1.0.24.

## v-1.0.23

### [v 1.0.23] 2026-07-12 11:12 am - working on migration

#### Database Changes

- Database update: Yes (auto-check).

#### App Codebase Changes

- Bumped workspace version to 1.0.23.

## v-1.0.22

### [v 1.0.22] 2026-07-11 7:05 pm - Super Admin App Operations Experience

#### Database Changes

- Database update: No (manual).

#### App Codebase Changes

- Reworked the Super Admin repository app strip into a fixed responsive five-column grid with automatic wrapping and no horizontal scrollbar.
- Added distinct light pastel gradients, coordinated icon treatments, soft borders, and corner-white glow effects for each repository app card.
- Applied the selected app's visual identity to the App Operations hero while keeping operational controls and status information clear.
- Added low-intensity app-matched gradients to service metrics without changing service-list or supporting-panel surfaces.
- Preserved responsive layouts, dark-mode variants, hover feedback, and status-badge contrast across the updated operations experience.
- Verified the Platform web application with focused formatting, TypeScript checks, and repository diff validation.
- Bumped workspace version to 1.0.22.

## v-1.0.21

### [v 1.0.21] 2026-07-11 5:42 pm - Super Admin App Operations

#### Database Changes

- Database update: No (manual).

#### App Codebase Changes

- Removed the redundant page-title breadcrumb segment from the Super Admin top bar.
- Replaced the Super Admin overview dashboard cards with a compact live strip for every runnable repository app.
- Added App Operations maintenance pages with service availability, port response time, managed uptime, terminal PID, and per-service health metrics.
- Added guarded Open & start, Stop, Update, and Refresh controls; app starts and updates open in new visible terminals while stop is limited to process trees recorded by the orchestrator.
- Added independent Start, Stop, and Restart controls for every API/Web service with service-specific PID and uptime ownership.
- Enlarged repository app and metric cards with mild theme-token gradients, stronger icon treatment, and improved hover elevation.
- Reworked the repository app strip into a fixed responsive grid with five cards per wide row, automatic wrapping, no horizontal scrollbar, and a distinct theme-token color treatment for each app.
- Bumped workspace version to 1.0.21.

## v-1.0.20

### [v 1.0.20] 2026-07-11 5:15 pm - working on platform registry

#### Database Changes

- Database update: No (auto-check).

#### App Codebase Changes

- Bumped workspace version to 1.0.20.

## v-1.0.19

### [v 1.0.19] 11/07/2026 11:10 am - Task Manager Todo editor and workflow improvements

#### Database Changes

- Database update: No.

#### App Codebase Changes

- Added a module-owned minimal Todo rich-text editor with essential formatting controls, clean list previews, and shared workspace styling.
- Bumped workspace version to 1.0.19.

## v-1.0.18

### [v 1.0.18] 2026-07-11 9:54 am - working on eway and einvoice

#### Database Changes

- Database update: Yes (auto-check).

#### App Codebase Changes

- Bumped workspace version to 1.0.18.
- Added shadcn Typeset, Geist Variable, and Geist Mono typography assets to the shared UI stylesheet.
- Applied the `typeset typeset-article` preset to the Workspace Editor rich-content preview, replacing its previous `prose` styling.

## v-1.0.17

### [v 1.0.17] 2026-07-11 12:33 am - Independent export sales clone

#### Database Changes

- Database update: Yes (manual).
- Wired the Export Sales migration into tenant billing database bootstrap and added the Export Sales lookup routes.

#### App Codebase Changes

- Refactored Export Sales into an independent clone of the Quotation/Sales workspace with matching list, upsert, item entry, autocomplete, totals, show, activity tools, and print preview flows.
- Added Export Sales revoke/delete workflow parity, validation handling, and deferred accounting posting behavior.
- Bumped the workspace version to 1.0.17.

## v-1.0.16

### [v 1.0.16] 2026-07-10 11:22 pm - Contact legal name magic autofill

#### Database Changes

- Database update: No (auto-check).

#### App Codebase Changes

- Bumped workspace version to 1.0.16.

## v-1.0.15

### [v 1.0.15] 2026-07-10 10:55 pm - Independent sales module clone

#### Database Changes

- Database update: Yes (manual).
- Added sales migration fields for tax type, work order, sales ledger, terms, and GST split values.
- Added the Sales-owned Core lookup proxy for contacts, addresses, products, categories, HSN codes, units, taxes, colours, sizes, and work orders.

#### App Codebase Changes

- Cloned the quotation list, upsert, show, print preview, and print route into independent Sales-owned UI code.
- Added Sales item entry with product autocomplete, inline lookup creation, tax-aware CGST + SGST or IGST columns, totals, and round-off controls.
- Added Sales contact and address autocomplete flows with editable billing and shipping address dialogs.
- Added Sales comments, activity timeline, entry tools, print copies, navigation, status actions, and save toasts.
- Removed the older Sales form/list implementation from the active module exports so the cloned Sales workflow is the only owned frontend path.
- Bumped the workspace version to 1.0.15.

## v-1.0.14

### [v 1.0.14] 2026-07-10 10:02 pm - Quotation save, submit, revoke, and edit controls

#### Database Changes

- Database update: Yes (auto-check).
- No quotation database schema changes were introduced by this work.

#### App Codebase Changes

- Added separate Save and save-action dropdown controls for saving drafts, submitting quotations, and admin revoke.
- Added draft/submitted workflow handling with revoke support for eligible non-invoiced quotations.
- Locked quotation editing after submission for regular users and kept invoiced quotations protected.
- Added fixed footer New quotation navigation for starting a fresh quotation without leaving the workspace.
- Bumped workspace version to 1.0.14.

## v-1.0.13

### [v 1.0.13] 2026-07-10 3:41 pm - Quotation Contact Quick Upsert

#### Database Changes

- Database update: Yes (manual).
- No database schema changes. The quotation lookup proxy creates and updates existing Core contact records.

#### App Codebase Changes

- Added a contact-only quick upsert dialog to the Quotation customer lookup with name, legal name, phone, email, and address lines.
- A missing contact search now offers New contact; saving silently refreshes the lookup and selects the created contact.
- Selected contacts show an arrow edit control in place of the lookup chevron; saving refreshes and retains the edited contact selection.
- Added Billing API proxy routes for Quotation contact create/update so browser traffic remains within the Billing module boundary.
- Split quick contact upsert into Details and Address tabs, added GSTIN and Address Type, and made State, District, City, and Pincode dependent lookup/create controls with India as the hidden default country.
- Widened the contact dialog, changed the fast-entry fields to a single-column flow, removed Email from the form, and made Address Type a create-capable autocomplete.
- Added Quotation-owned create/edit lookup popups for Products and Work Orders, inline Colour and Size creation, and an Items tab that contains both quotation lines and totals without the former tab-area divider.
- Bumped workspace version to 1.0.13.

## v-1.0.12

### [v 1.0.12] 2026-07-10 3:27 pm - Quotation Module Consolidation

#### Database Changes

- Database update: Yes (manual).
- Stopped the legacy Entries migration from creating new quotation entry tables. Existing legacy tables are retained for non-destructive upgrades.

#### App Codebase Changes

- Removed the duplicate Entries quotation routes, conversion endpoint, renderer, types, and its obsolete database test.
- Made `billing/quotation` the single quotation workflow, including conversion to a Sales invoice and storing the generated invoice number on the quotation.
- Added draft-only edit/confirm guardrails, cancellation rules, duplicate-number validation, and deterministic configured numbering for new quotations.
- Published quotation domain events and enqueued workflow jobs for create, update, confirm, cancel, and conversion actions.
- Added a Billing-owned Core lookup proxy for contacts, work orders, products, colours, and sizes; the Quotation browser UI no longer calls Core directly.
- Removed unused quotation form/list duplicates and added Quotation service regression tests for numbering, lifecycle, conversion, events, and queue jobs.
- Bumped workspace version to 1.0.12.

## v-1.0.11

### [v 1.0.11] 2026-07-10 2:23 pm - Quotation item table polish

#### Database Changes

- Database update: No (manual).

#### App Codebase Changes

- Bumped workspace version to 1.0.11.

## v-1.0.10

### [v 1.0.10] 2026-07-10 12:00 pm - Core Work Order Module Ownership

#### Database Changes

- Database update: Yes (manual).
- Added the protected Work Order placeholder seed (`WO-0000`) for `work_orders`.
- Aligned master-record protection so global and placeholder records are blocked consistently in update, status, and force-delete flows.

#### App Codebase Changes

- Moved Work Order out of the shared master workspace/list wrappers into module-owned `work-order` workspace, list, form, hooks, services, and definition files.
- Flattened the Work Order form into one owned panel and removed inherited Contact/Product tabs.
- Removed Contact lookup and Contact list column from Work Order so the module no longer feels coupled to Contact master behavior.
- Kept Work Order name and code as edit links for editable rows while protected rows render plain text with the protected indicator.
- Removed Work Order-specific branches from the shared master workspace so future Contact/Product changes do not bleed into Work Order.
- Verified the refactor with Core Web and Platform Web type checks.
- Bumped workspace version to 1.0.10.

## v-1.0.9

### [v 1.0.9] 2026-07-09 7:53 pm - Billing Settings and Quotation Workflow

#### Database Changes

- Database update: Yes (manual).
- Preserved operator-configured tenant app access during default-tenant boot seeding instead of replacing it with seed defaults.
- Synchronized tenant module settings so disabled and enabled app records remain accurate after provisioning and restart.
- Extended tenant billing settings JSON with shared layout, printing, customisation, feature, and document-numbering defaults.
- Added backward-compatible normalization for legacy per-document layouts and removed obsolete hidden feature and totals settings.
- Added tenant-scoped automatic numbering profiles for Sales, Quotation, Purchase, and Export Sales.

#### App Codebase Changes

- Added development-only CODEXSUN tenant auto-login controlled by `.env`, using the normal server-side credential verification and session flow.
- Added Billing API to the Platform development stack and verified Billing Settings startup, CORS, and tenant database loading.
- Rebuilt Billing Settings with shared global PO, DC, Colour, Size, E-invoice, and E-way controls for Quotation, Sales, and Purchase.
- Added persisted Printing controls, custom terms, live letterhead preview/designer, document titles, print language, and focused feature switches for Quotation, Export Sales, and TConnect.
- Added a Document Settings workspace with automatic mode, prefix, separator, suffix, next number, padding, and live previews.
- Connected automatic numbering to Sales and Quotation creation and advanced counters only after successful saves.
- Reshaped Quotation entry with header tabs, Details, Other Details, Address, and Terms sections; removed Quotation E-way and E-invoice tabs.
- Reordered Quotation details into customer/work-order and number/date/tax columns, moved item entry into Details, aligned totals right, and added Save, Save & Print, and Cancel footer actions.
- Connected Quotation PO, DC, Colour, and Size item columns to the global Billing Layout switches.
- Added regression coverage for tenant access preservation and updated Billing Settings validation for the finalized payload.
- Bumped workspace version to 1.0.9.

## v-1.0.8

### [v 1.0.8] 2026-07-09 5:17 pm - update sales quotations

#### Database Changes

- Database update: Yes (auto-check).

#### App Codebase Changes

- Bumped workspace version to 1.0.8.

## v-1.0.7

### [v 1.0.7] 2026-07-08 7:28 pm - Database Lifecycle CLI

#### Database Changes

- Database update: Yes (manual).
- Added Platform database lifecycle commands for master and tenant databases: `db:migrate`, `db:seed`, `db:drop`, and `dbmigrate:fresh`.
- Added a Platform API database CLI that reuses the same Kysely migration and seed paths as application startup.
- Added tenant app-module migration and seed passes so registered tenant databases are migrated and seeded from the master tenant registry.
- Added `CODEXSUN_DB_FRESH_ON_START` to optionally drop, recreate, migrate, and seed configured databases during API startup.
- Added destructive action guards: `CODEXSUN_DB_RESET_CONFIRM=DROP_DATABASES`, plus `CODEXSUN_ALLOW_PRODUCTION_DB_RESET=1` when `NODE_ENV=production`.
- Made drop/fresh remove registered tenant databases before dropping the master database.

#### App Codebase Changes

- Simplified the tenant Countries list and editor to show only country name, country code, status, and active control;
  ISO, dial, currency, and sort-order fields remain backend-compatible but are hidden from the tenant frontend.
- Added tenant Country row actions for view, edit, suspend, and guarded force delete, with global country protection.
- Restyled the location Active control as a compact input-height status switch without helper text.
- Fixed bodyless location action requests so Suspend and Force delete are not rejected as empty JSON payloads.
- Replaced generic location duplicate failures with exact name/code conflict messages in the form error banner.
- Simplified the tenant State editor to State name, GST State code, Country, and Active in the same full-width tone as Country.
- Added State view, edit, suspend, and guarded force-delete row actions.
- Added reusable location dependency checks that block force deletion while child location records still reference a parent.
- Applied the finalized full-width master form and row-action pattern to Districts, Cities, and Pincodes.
- Replaced Pincode parent-name inputs with cascading Country, State, District, and City references.
- Enabled editing, suspension, and guarded deletion of seeded District, City, and Pincode rows inside each isolated tenant database.
- Made primary District, City, and Pincode values open Edit directly, removed redundant View actions, and protected the `-` placeholder rows.
- Backfilled seeded Pincodes with Country, State, District, and City IDs so legacy records populate relationship controls and participate in dependency checks.
- Added Tenant-pattern pagination to every location master list with rows-per-page controls, filtered totals, stable row numbering, and page reset on filter changes.
- Applied the finalized master-list pattern to Contact Groups, Contact Types, Address Types, and Bank Names.
- Added protected `-` seeds, editable seeded rows, pagination, clickable names, lifecycle menus, compact Active controls, and force delete for those four masters.
- Seeded Contact Groups with Business and Web Clients, and Contact Types with Customer, Supplier, Vendor Customer, Staff, and Employee.
- Expanded Bank Names from the current RBI directory across public, private, local-area, small-finance, payments, regional-rural, foreign, and state cooperative banks.
- Replaced protected-row text with a shared amber shield indicator and hover tooltip across location and contact masters.
- Extended the finalized protected-row, editable seed, pagination, lifecycle menu, compact Active, and no-sort-order pattern to all Product, Work Order, and Other common masters.
- Added persisted Currency symbols with INR and USD seed backfill, plus reusable missing-column migration support for common masters.
- Converted Months into FY 2026-27 accounting periods with Name, From date, To date, and Active.
- Added loud CLI/startup warnings before destructive database lifecycle actions.
- Added stable migration preflight/list/run/local-test, dump, restore-test, and backup-verification command names.
- Added explicit safety guards for restored-dump migration tests, sandbox restore tests, production backup verification, and backup artifact verification.
- Added database migration, backup, and legacy client migration runbooks plus reusable legacy intake/mapping/validation/cutover templates.
- Documented the baseline backup and restore-test schedule.
- Added console progress logs for database bootstrap, master/tenant database creation, migrations, platform app seeding,
  default tenant seeding, tenant module seeding, tenant admin seed status, and database CLI commands.
- Standardized Platform dev logs so `platform-api` displays as `api` and `platform-web` displays as `web` in stack and
  preflight output.
- Closed tenant database pools after provisioning so one-shot DB commands exit cleanly.
- Documented lifecycle switches in `.env` and `.env.example`.
- Bumped workspace version to 1.0.7.

## v-1.0.6

### [v 1.0.6] 2026-07-08 7:20 pm - Env Driven Tenant Domain Seed

#### Database Changes

- Database update: Yes (manual).
- Added `DEFAULT_TENANT_DOMAIN` so the test-only default tenant seed stores its primary domain from env.
- Added `TENANT_DOMAIN_BASE` so newly created tenant domains are generated from env instead of a hard-coded `.codexsun.local` suffix.
- Set the local/test default domain values to `localhost` in `.env` and `.env.example` while keeping seed data disabled and blank by default.
- Updated the CODEXSUN auth e2e to verify login through the seeded `localhost` tenant domain.

#### App Codebase Changes

- Removed the remaining hard-coded default tenant domain suffix from Platform API tenant seed/repository paths.
- Added `assist/documentation/project-inventory.md` as the current workspace inventory and latest work update for future agents.
- Linked the project inventory from `assist/README.md` and added it to the recommended reading order.
- Bumped workspace version to 1.0.6.

## v-1.0.5

### [v 1.0.5] 2026-07-08 7:04 pm - Test-Only Default Tenant Seed

#### Database Changes

- Database update: Yes (manual).
- Moved the default tenant seed behind `ENABLE_DEFAULT_TENANT_SEED=1`.
- Cleared fixed master database, tenant database, DB user, DB password, JWT, and seed user values from `.env` and `.env.example`.
- Made `DEFAULT_TENANT_*` optional for normal runtime and required only when the test seed switch is enabled.
- Kept CODEXSUN seed data inside e2e setup only, with disposable test databases.

#### App Codebase Changes

- Updated the environment helper banner to explain that default tenant values are test-only.
- Updated tenant database e2e setup to explicitly enable and configure the default seed for test runs.
- Bumped workspace version to 1.0.5.

## v-1.0.4

### [v 1.0.4] 2026-07-08 6:59 pm - Strict Environment Configuration

#### Database Changes

- Database update: Yes (manual).
- Removed runtime fallback database names from Platform, Core, Billing, and database helper code.
- Required `DB_MASTER_NAME`, `DB_USER`, `DB_PASSWORD`, and `DEFAULT_TENANT_*` values to come from explicit environment configuration.
- Changed the database user helper to read root `.env` and require configured admin/app user credentials and tenant database values.
- Kept e2e database tests isolated by injecting their own disposable environment values.

#### App Codebase Changes

- Added a shared missing/invalid `.env` banner with setup commands: `Copy-Item .env.example .env` and `npm run env:jwt-secret`.
- Removed runtime JWT development-secret fallbacks from Core and Billing APIs.
- Removed hard-coded admin email placeholders from shared UI layouts.
- Bumped workspace version to 1.0.4.

## v-1.0.3

### [v 1.0.3] 2026-07-08 6:52 pm - CODEXSUN Database Naming Seed

#### Database Changes

- Database update: Yes (manual).
- Changed the default master database name from `codexsun_master_db` to `cxsun_master_db`.
- Changed the default `CODEXSUN` tenant database name from `codexsun_tenant_db` to `codexsun_db`.
- Updated Platform, Core, Billing, setup tooling, and assist architecture references to use the new master database default.
- Kept the default tenant seeder idempotent so first boot creates or updates the `CODEXSUN` tenant with the new tenant database name.

#### App Codebase Changes

- Updated the `CODEXSUN` tenant auth e2e to run against disposable databases using the new naming pattern and verify seed, login, JWT/session, and tenant runtime.
- Bumped workspace version to 1.0.3.

## v-1.0.2

### [v 1.0.2] 2026-07-08 6:35 pm - Default CODEXSUN Tenant Auth Seed

#### Database Changes

- Database update: Yes (manual).
- Added an idempotent default tenant seed for `CODEXSUN` during Platform API bootstrap.
- Added `.env`-driven default tenant settings: name, corporate ID, slug, tenant database name, and default tenant admin credentials.
- Provisioned the default `CODEXSUN` tenant database with tenant module settings and a tenant-local admin user when `DEFAULT_TENANT_ADMIN_PASSWORD` is configured.
- Kept tenant identity database-owned by seeding master tenant and tenant domain rows, with `uuid` used for external JWT/session identity.

#### App Codebase Changes

- Hardened tenant login around the seeded tenant path: Corporate ID + domain resolution, tenant database lookup, tenant-local user verification, signed JWT issue, session verification, and tenant runtime access.
- Added `CODEXSUN` start-to-finish e2e coverage that boots the app, seeds the tenant, logs in, verifies the signed JWT/session, resolves runtime, and cleans up disposable databases.
- Updated platform e2e script to include both tenant database isolation and default tenant auth flows.
- Bumped workspace version to 1.0.2.

## v-1.0.1

### [v 1.0.1] 2026-07-08 2:12 pm - Clean Platform Foundation

#### Database Changes

- Removed copied demo tenant seed data from the Platform API in-memory tenant repository.
- Kept the tenant registry empty by default so the platform starts without fake customer data.
- Kept tenant module persistence as an in-memory foundation only; no production database migration was added in this baseline.

#### App Codebase Changes

- Reduced the copied workspace to the current runnable foundation: `apps/platform/api`, `apps/platform/web`, `packages/framework`, `packages/ui`, and tooling.
- Reorganized Platform Web into a clean source structure:
  - `src/app` for bootstrap, providers, router, and design-system setup.
  - `src/desks` for `/sa`, `/admin`, and `/app` desk shells.
  - `src/modules/tenant` for the tenant frontend module.
  - `src/routes/public` for home, login, and status routes.
  - `src/shared` for API client, auth gate, and document title helpers.
- Removed the old `src/pages` dumping area, copied super-admin pages, template pages, design-system demo page, and stale tenant pages.
- Added the first standard Platform API module under `apps/platform/api/src/modules/tenant` using the required module file pattern:
  - `tenant.module.ts`
  - `tenant.service.ts`
  - `tenant.repository.ts`
  - `tenant.routes.ts`
  - `tenant.events.ts`
  - `tenant.migration.ts`
  - `tenant.worker.ts`
  - `tenant.seed.ts`
  - `tenant.sync.ts`
  - `tenant.test.ts`
  - `tenant.types.ts`
  - `index.ts`
- Updated the module-boundary checker to validate the current one-folder, module-prefixed file standard instead of the older folder-heavy pattern.
- Replaced the Platform Web API client with a local envelope-aware fetch client.
- Simplified Platform API auth/session routes into a development foundation without fake tenant records.
- Cleaned `/`, `/sa`, `/admin`, `/app`, and `/status` so they no longer show demo tenant names, fake databases, fake users, scaffold labels, or copied product claims.
- Removed unimplemented future module choices from tenant setup; tenant access now only guarantees `platform.tenant`.
- Removed copied API JSON registries, old e2e references, invalid database scripts, and stale Playwright config.
- Removed unused demo dashboard blocks and fake menu defaults from `packages/ui`.
- Pruned copied public/design/print CSS from Platform Web and kept only styles used by the current routes.
- Set Vite cache under the root dependency tree and kept a single root `node_modules`.
- Kept build output collected under the root `dist/` packaging surface.
- Verified the cleaned foundation with:
  - `npm.cmd run check`
  - `npm.cmd run build`
  - route smoke checks for `/`, `/sa`, `/admin`, `/app`, and `/status`.
