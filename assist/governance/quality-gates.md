# Quality Gates

## Purpose

Quality gates define when work is ready to move forward.

They help CODEIT, developers, and reviewers decide whether a change is safe enough for the next stage.

## Planning Gate

Before build starts, confirm:

- Scope is clear.
- Owning module is identified.
- Tenant impact is understood.
- Permission impact is understood.
- Subscription impact is understood.
- Data and migration impact are known.
- Offline impact is considered.
- Test approach is listed.

## Build Gate

Before review, confirm:

- Code follows module boundaries.
- Business logic is in the right layer.
- Tenant context is present.
- Permissions are checked.
- Errors are structured.
- Events and jobs are safe.
- Tests are added for risky behavior.
- Documentation is updated if needed.

## Review Gate

Before merge or release candidate, confirm:

- No cross-tenant data risk.
- No unauthorized access path.
- No accounting imbalance.
- No compliance audit gap.
- No hidden breaking API change.
- No unplanned migration risk.
- No uncontrolled background job failure.
- No major UI inconsistency.

## Release Gate

Before production release, confirm:

- Changelog is updated.
- Version is correct.
- Migrations are reviewed.
- Backups are ready.
- Rollback or recovery plan exists.
- Monitoring is active.
- Support notes are prepared.

## Emergency Gate

For urgent hotfixes:

- Fix the smallest safe issue.
- Verify the failing path.
- Add a regression check when possible.
- Record what was skipped.
- Follow up with cleanup if needed.
