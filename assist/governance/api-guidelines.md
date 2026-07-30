# API Guidelines

## API Goals

CODEXSUN APIs must be tenant-aware, permission-aware, stable, and clear for web, desktop, mobile, workers, integrations, and AI tools.

## API Rules

- Every business API must resolve tenant context.
- Every protected API must check authentication.
- Every business action must check authorization.
- API boundaries should use Zod validation.
- APIs should call application services, not database tables directly.
- API responses should avoid leaking internal implementation details.
- Validation errors should be clear and field-specific.
- Financial and compliance APIs should be especially explicit.
- Tenant-scoped API calls should send `x-tenant-id` header with the validated database tenant ID.
- The `x-tenant-id` header alone never authenticates or authorizes a request.
- Protected tenant routes must validate that header tenant ID matches the authenticated session/JWT tenant context.

## API Types

### Public Client APIs

Used by web, desktop, and mobile clients.

Need:

- Stable contracts.
- Pagination.
- Filtering.
- Sorting.
- Permission-aware responses.
- Clear error formats.

### Internal APIs

Used between app runtime parts.

Need:

- Strong authentication.
- Tenant context.
- Trace IDs.
- Version awareness.

### Integration APIs

Used by external apps and customer integrations.

Need:

- API keys or OAuth where appropriate.
- Rate limits.
- Webhook verification.
- Tenant scoping.
- Audit logs.
- Versioned contracts.

### AI Tool APIs

Used by CODEIT or ZERO.

Need:

- Strict permission checks.
- Purpose-based access.
- Limited fields.
- Audited tool calls.
- Safe action confirmation.

## Shared Contracts

Backend modules should expose public API contracts from their `contracts/` folder.

Contracts may include:

- Zod schemas.
- Request types.
- Response types.
- Route contract metadata.
- Shared API error codes.

Database models should not be exposed directly as API contracts.

## Shared API Client

Frontend, desktop, mobile, CLI, and internal tools should use `@codexsun/api-client` where practical.

The API client should handle:

- Standard response envelope.
- Error normalization.
- Auth/session behavior.
- Tenant context.
- Typed calls through shared contracts.
- App-specific base URLs.

## Error Shape

Errors should include:

- Code.
- Message.
- Field errors where relevant.
- Trace ID.
- Retry hint where relevant.

Avoid exposing stack traces or database details to clients.

## Response Envelope

All APIs should return the standard CODEXSUN envelope.

Success:

```json
{
  "success": true,
  "data": {},
  "meta": {
    "requestId": "req_123",
    "timestamp": "2026-06-28T10:00:00Z",
    "tenantId": "tenant-uuid-456"
  }
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "TENANT_NOT_FOUND",
    "message": "Tenant not found",
    "details": {}
  },
  "meta": {
    "requestId": "req_123",
    "timestamp": "2026-06-28T10:00:00Z",
    "tenantId": "tenant-uuid-456"
  }
}
```

### Envelope Meta Fields

| Field           | Required | Description                                                          |
| --------------- | -------- | -------------------------------------------------------------------- |
| `correlationId` | optional | Echoes `x-correlation-id` header. Auto-generated if client omits it. |
| `requestId`     | always   | Fastify request ID, used as internal trace value                     |
| `timestamp`     | always   | ISO 8601 timestamp of response generation                            |
| `tenantId`      | optional | Present when the request carried a validated `x-tenant-id` header    |

### Request Header Contract

| Header             | When to send            | Description                                                                                                                                  |
| ------------------ | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `x-tenant-id`      | Tenant-scoped API calls | Validated database tenant ID from session/JWT. Never used alone for auth.                                                                    |
| `x-correlation-id` | All API calls           | Restored in v1.0.4. Echoed in envelope meta as `correlationId`. Task 1 proposes deprecating in favor of `requestId` + `tenantId` separation. |

## API Guard Pattern

All protected routes use shared guard helpers from `apps/platform/api/src/auth/guards.ts`.

### Available Guards

| Guard                                         | Purpose                                                                | Throws                                                        |
| --------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------- |
| `requireSession(app, request)`                | Resolves active session from Bearer token or `codexsun_session` cookie | `AppError.unauthorized()` if missing or invalid               |
| `requireUserType(session, allowedTypes)`      | Checks user type against allowed list                                  | `AppError.forbidden()` if type not allowed                    |
| `requireSuperAdmin(app, request)`             | Wrapper for super-admin-only routes                                    | `AppError.unauthorized()` or `AppError.forbidden()`           |
| `requireTenantMatch(request, session)`        | Verifies `x-tenant-id` header matches authenticated session tenant     | `AppError.validation()` or `AppError.forbidden()` on mismatch |
| `requirePermission(session, permission)`      | Placeholder: super-admin allowed, others denied                        | `AppError.forbidden()` with permission name                   |
| `requireActiveTenant(session)`                | Placeholder: always passes                                             | None yet                                                      |
| `requireFeatureEnabled(tenantId, featureKey)` | Placeholder: always passes                                             | None yet                                                      |

### Route Ownership

| Route module                  | File                                     | Owner                    |
| ----------------------------- | ---------------------------------------- | ------------------------ |
| Auth (login, session, logout) | `apps/platform/api/src/auth/routes.ts`   | `@codexsun/platform-api` |
| Tenant management CRUD        | `apps/platform/api/src/tenant/routes.ts` | `@codexsun/platform-api` |

### Audit Events

Auth and tenant mutations write audit events through `AuditService` (`@codexsun/platform/audit`).

| Event Name           | Trigger                       | Fields                                     |
| -------------------- | ----------------------------- | ------------------------------------------ |
| `auth.login.success` | Successful login              | actorType, actorEmail, tenantId (optional) |
| `auth.login.failed`  | Failed login attempt          | actorType, actorEmail                      |
| `auth.logout`        | Logout call                   | actorType, actorEmail, tenantId (optional) |
| `tenant.created`     | Tenant created by super admin | actorEmail, tenantId, tenantCode           |
| `tenant.updated`     | Tenant updated by super admin | actorEmail, tenantId, changes              |
| `tenant.deleted`     | Tenant deleted by super admin | actorEmail, tenantId, tenantCode           |

Audit failures are non-blocking: the main action completes and the failure is logged.
