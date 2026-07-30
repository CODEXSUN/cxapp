# Enterprise Reference Architecture

## Purpose

This is the target architecture shape for CODEXSUN when serving serious production customers.

It keeps the modular monolith as the product core while adding enterprise-grade runtime separation, observability, data protection, and operations.

## Logical Architecture

Primary logical areas:

- Web client.
- Desktop client.
- Mobile client.
- API gateway or API entry layer.
- Modular backend application.
- Domain modules.
- Event bus.
- Queue workers.
- Scheduler.
- Sync service.
- Reporting service or read models.
- Integration adapters.
- AI assistant service layer.
- Platform database.
- Tenant databases.
- File storage.
- Observability stack.

## Runtime Architecture

Recommended production runtime:

- Frontend container.
- API container.
- Worker container.
- Scheduler container.
- Sync worker container.
- Integration worker container.
- Reporting worker container.
- AI tool service container if needed.
- MariaDB tenant databases.
- Redis or compatible queue/cache where selected.
- Object storage for documents and files.

The first implementation can run fewer containers, but the architecture should allow this separation.

## Request Flow

Standard business request flow:

1. Client sends authenticated request.
2. API resolves tenant, user, subscription, and permissions.
3. Application service runs use case.
4. Domain module applies business rules.
5. Data is written to tenant database.
6. Audit entry is recorded where required.
7. Domain event is published.
8. Queue jobs are created for side effects.
9. Client receives clear response.

## Background Flow

Standard background job flow:

1. Job is queued with tenant context.
2. Worker restores tenant context.
3. Worker validates module and feature availability.
4. Worker performs idempotent work.
5. Worker records status.
6. Worker retries or dead-letters on failure.
7. Support console exposes failed jobs.

## AI Tool Flow

ZERO business assistant flow:

1. User asks a question.
2. Assistant resolves tenant and user permissions.
3. Tool request is planned.
4. Approved data API fetches permitted data only.
5. Assistant summarizes with source references.
6. Any business action needs confirmation.
7. Tool use is logged.

CODEIT development assistant flow:

1. Developer asks for planning, build, review, or debug help.
2. CODEIT reads relevant assist docs and code context.
3. It proposes or performs scoped changes.
4. It checks architecture, tests, and docs.
5. It reports outcome clearly.

## Enterprise Split Points

Modules that may later become separately deployable:

- Reporting.
- Offline sync.
- Integrations.
- AI tool service.
- Billing compliance integrations.
- High-volume POS processing.
- Notification delivery.

Split only when there is proven pressure from scale, reliability, security, or team ownership.
