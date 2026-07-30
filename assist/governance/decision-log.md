# Decision Log

This file records important product and architecture decisions.

## ADR-0001: Use Modular Monolith As Primary Architecture

Status: Accepted

Date: 2026-06-28

Decision:

CODEXSUN will use a scalable modular monolith as the primary architecture pattern.

Reason:

The product needs many apps, industries, and tenant customizations, but early separation into many services would increase operational complexity. A modular monolith gives one codebase with clear boundaries while preserving the option to split heavy modules later.

Consequences:

- Module boundaries must be enforced carefully.
- Events and queues will be used for side effects and background work.
- Containers can separate runtime roles such as API, worker, scheduler, and frontend.
- Future microservice extraction remains possible but should be based on proven pressure.

## ADR-0002: Tenant Context Is Mandatory

Status: Accepted

Date: 2026-06-28

Decision:

Every business operation must include tenant context.

Reason:

CODEXSUN is a multi-tenant SaaS platform with tenant-specific databases, configuration, features, and customizations. Tenant context protects data isolation and keeps behavior predictable.

Consequences:

- APIs, jobs, events, sync payloads, logs, and AI tools must carry tenant context.
- Tests should include tenant isolation checks.
- Shared utilities must not silently access tenant data.

## ADR-0003: AI Assistants Have Separate Roles

Status: Accepted

Date: 2026-06-28

Decision:

CODEIT and ZERO are separate assistants.

Reason:

CODEIT serves development work. ZERO serves business users inside the application. Mixing these roles would create security, UX, and permission confusion.

Consequences:

- CODEIT can access code and planning context.
- ZERO can access only permitted tenant business data through approved tools.
- Both assistants require separate prompts, permissions, tools, logs, and interfaces.
