# Versioning And Releases

## Version Policy

CODEXSUN uses lockstep versioning across the root package and all workspaces.

Package version format:

```text
1.0.<reference>
```

Git tags use the `v-` prefix:

```text
v-1.0.<reference>
```

Workspace package versions describe a tested source-repository baseline and remain lockstep. Deployable
product stacks additionally have independent semantic release lines without changing package versions:

```text
v-billing-X.Y.Z
```

Stack tags identify an independently deployable API/web product unit and must follow the service and
database boundary in `tools/product-stack-contract.mjs`. Creating a stack tag is an explicit release
operation; architecture or implementation work alone does not create one. Shared Platform/Core contract
changes are released through the normal lockstep baseline first and must pass every affected stack gate.

Changelog entry labels use the human-readable form:

```text
v 1.0.<reference>
```

## Reference Policy

Every meaningful batch uses a reference number such as `#1`, `#2`, or `#155`.

Rules:

- The batch reference in `assist/execution/task.md` must match `assist/execution/planning.md` when those files exist.
- App version `1.0.<reference>` derives from the batch reference number.
- Changelog entries use the same reference and workspace local time.
- Changelog entry format is `### [v 1.0.10] YYYY-MM-DD h:mm am - Title`.
- Commit subjects use the latest versioned changelog entry as `#<ref> - <title>`.

## Active Changelog File

The active release changelog lives at:

```text
assist/documentation/CHANGELOG.md
```

It must contain a `Version State` block at the top with:

- Current numeric package version.
- Current `v-` release tag.
- Current human-readable changelog label.

## Changelog Policy

Historical changelog entries are immutable.

A version bump may update the `Version State` block and add a concrete version entry, but it must not rewrite old entry labels.

Rules:

- Every changelog entry must live under a concrete `## v-<version>` section.
- Do not use an `Unreleased` section.
- Every new changelog entry must split notes into `#### Database Changes` and `#### App Codebase Changes`.
- Changelog times use the workspace local timezone and lowercase `am` / `pm`.
- During an active version, append progress notes to the latest current-version changelog entry as each meaningful stage is completed.
- Do not create a new version section just because implementation work continued.
- Continue using the current version section until the user explicitly requests a version bump.

## Database Changes

Use this section for:

- Database schema changes.
- Migrations.
- Seed data.
- Tenant provisioning changes.
- Data compatibility changes.
- Data backfills.
- Migration risk notes.

## App Codebase Changes

Use this section for:

- UI changes.
- API changes.
- Service logic.
- Tooling.
- Documentation.
- Tests.
- Queue workers.
- Events.
- Sync logic.
- Deployment scripts.

## Changelog Quality Rules

Changelog bullets must be specific enough for the next agent to understand what changed without rereading the full diff.

Do not add vague bullets such as:

- Updated files.
- Cleanup.
- Misc changes.

## Version Bump Command Rule

Version bumps happen only when the user explicitly asks for a version bump or release/version update.

Do not infer a version bump from normal implementation requests, documentation requests, cleanup requests, test additions, refactors, or module migrations.

Do not manually edit package versions, lockfile versions, app display versions, release tags, or the changelog `Version State` block unless performing an explicit version bump task.

If progress must be recorded but no version bump was requested, update the latest existing changelog entry under the current version.

Preferred commands:

```text
npm run version:bump -- --title "<title>" --database-update
npm run version:bump -- --title "<title>" --no-database-update
```

Choose exactly one database flag when the database impact is known.

After a version bump command, review the generated changelog entry and add precise bullets for the work completed in that version.

## Database Update Detection

Version bump automation should check changed database, schema, and migration files and write:

```text
Database update: Yes
```

or:

```text
Database update: No
```

Use `--database-update` or `--no-database-update` to manually override the database update check when needed.

## GitHub Commit Rule

`npm run github:now` reads the latest versioned changelog entry and must not include changelog dates or timestamps in the Git commit subject.

`npm run github:now` may offer an interactive option to bump the next version before commit. If the bump is declined, it does not change versions.

It must stop for an interactive commit-message review and confirmation before running Git mutations.

The helper runs these Git steps only after confirmation:

```text
git pull --rebase --autostash
git add -A
git commit -m "<subject>"
git push
```

Use `npm run check:versions` to verify package versions and the changelog Version State are aligned.

## Documentation Progress Rule

Documentation is part of implementation, not final optional cleanup.

At every meaningful stage, update the closest active documentation before marking the stage complete.

Local module docs must be created or updated in the same patch as module code when a module is added, migrated, renamed, or given new routes, events, queue jobs, sync tags, tables, or tests.

Central docs must be updated when the change affects users, support, onboarding, deployment, API consumers, module boundaries, or future agent behavior.

Assist rules, context, or execution docs must be updated when the decision affects architecture, service ownership, release process, verification, or AI workflow.

Do not finish a code change with undocumented new behavior unless the change is truly invisible plumbing and the changelog explains it.

## Release Operation

Version, changelog, and tag naming must stay aligned in the same batch.

Rules:

- Release tags use the `v-` prefix.
- Validate before tagging a release.
- Version bumps only happen as explicit release tasks.
- Run `npm run check` before finalizing work that changes code, service boundaries, rules, documentation workflow, changelog policy, or package versions.

## Build Output

Runnable app builds go to the root `dist/apps/...` tree.

Workspace package builds still create package-local `dist/` folders for Node package export compatibility, then `tools/collect-dist.mjs` copies those package outputs into the root `dist/packages/...` tree.

The root build command clears root `dist/` first, runs all workspace builds, and then collects package outputs into the common root build folder.

Never emit generated build outputs into source trees.

Do not emit these into `src/`:

- `.js`
- `.js.map`
- `.d.ts`
- `.d.ts.map`
