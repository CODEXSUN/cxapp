# CODEIT Workflows

## Purpose

This document gives CODEIT practical workflows for common development activities.

## New Feature Workflow

1. Read product scope and relevant module docs.
2. Identify owning domain.
3. Identify tenant, permission, subscription, and offline impact.
4. Draft small implementation plan.
5. Build in focused steps.
6. Add or update tests.
7. Update docs and changelog when needed.
8. Summarize result and remaining risks.

## Bug Fix Workflow

1. Reproduce or understand the failure.
2. Identify affected tenant, module, and workflow.
3. Find root cause.
4. Make the smallest safe fix.
5. Add regression coverage.
6. Check related events, jobs, and sync behavior.
7. Document customer impact if needed.

## Architecture Review Workflow

1. Identify decision being reviewed.
2. Compare against `assist/architecture/architecture-principles.md`.
3. Check tenant isolation.
4. Check module ownership.
5. Check enterprise readiness.
6. Check operational impact.
7. Record decision in decision log if accepted.

## UI Workflow

1. Identify user role and task.
2. Use design system components.
3. Keep business data scannable.
4. Include empty, loading, error, and permission states.
5. Verify responsive layout.
6. Avoid feature explanation text inside the app unless users need it to complete work.

## Database Change Workflow

1. Identify affected tenant databases.
2. Design migration.
3. Plan indexes.
4. Plan backfill if required.
5. Plan rollback or recovery.
6. Test migration with sample tenant data.
7. Document migration risk.

## Integration Workflow

1. Identify provider.
2. Create adapter boundary.
3. Store credentials securely.
4. Use queues for external calls where possible.
5. Log provider metadata.
6. Handle retries and failures.
7. Expose status to support.
