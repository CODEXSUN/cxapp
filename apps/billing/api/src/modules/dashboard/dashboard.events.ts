import type { DomainEvent } from "@codexsun/framework/events";
import type { DashboardProjectionRequest } from "./dashboard.types.js";

export const dashboardEvents = {
  projectionRequested: "billing.dashboard.projection-requested",
  projectionUpdated: "billing.dashboard.projection-updated"
} as const;

export function createDashboardProjectionEvent(
  databaseName: string,
  request: DashboardProjectionRequest
): DomainEvent<DashboardProjectionRequest> {
  return {
    correlationId: `${request.source}:${request.documentId}:${Date.now()}`,
    eventName: dashboardEvents.projectionRequested,
    eventVersion: 1,
    occurredAt: new Date().toISOString(),
    payload: request,
    sourceModule: `billing.${request.source}`,
    tenant: { tenantId: databaseName }
  };
}
