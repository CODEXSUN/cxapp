import type { DomainEvent } from "@codexsun/framework/events";
import type { DashboardProjectionRequest } from "./dashboard.types.js";

export function shouldSyncDashboardProjection(event: DomainEvent<DashboardProjectionRequest>) {
  return (
    event.eventName === "billing.dashboard.projection-requested" &&
    Number.isInteger(event.payload.companyId) &&
    event.payload.companyId > 0 &&
    Number.isInteger(event.payload.financialYearId) &&
    event.payload.financialYearId > 0
  );
}
