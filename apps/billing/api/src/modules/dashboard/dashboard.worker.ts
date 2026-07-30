import type { DomainEvent } from "@codexsun/framework/events";
import { DashboardRepository } from "./dashboard.repository.js";
import { shouldSyncDashboardProjection } from "./dashboard.sync.js";
import type { DashboardProjectionRequest } from "./dashboard.types.js";

export class DashboardProjectionWorker {
  constructor(private readonly repository = new DashboardRepository()) {}

  async process(databaseName: string, event: DomainEvent<DashboardProjectionRequest>) {
    if (!shouldSyncDashboardProjection(event)) return null;
    return this.repository.rebuild(
      databaseName,
      event.payload.companyId,
      event.payload.financialYearId,
      event.eventName
    );
  }
}

export async function processDashboardProjectionJob(
  databaseName: string,
  event: DomainEvent<DashboardProjectionRequest>
) {
  return new DashboardProjectionWorker().process(databaseName, event);
}
