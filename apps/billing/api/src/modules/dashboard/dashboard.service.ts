import { InMemoryEventPublisher, type EventPublisher } from "@codexsun/framework/events";
import { createDashboardProjectionEvent } from "./dashboard.events.js";
import { DashboardRepository } from "./dashboard.repository.js";
import type { DashboardProjectionRequest } from "./dashboard.types.js";
import { DashboardProjectionWorker } from "./dashboard.worker.js";

export class DashboardService {
  constructor(
    private readonly repository = new DashboardRepository(),
    private readonly events: EventPublisher = new InMemoryEventPublisher(),
    private readonly worker = new DashboardProjectionWorker(repository)
  ) {}

  async get(databaseName: string, companyId?: number) {
    const context = await this.repository.context(databaseName, companyId);
    if (!context) return null;
    return (
      (await this.repository.get(databaseName, context.company_id, context.financial_year_id)) ??
      this.repository.rebuild(
        databaseName,
        context.company_id,
        context.financial_year_id,
        "billing.dashboard.self-heal"
      )
    );
  }

  async project(databaseName: string, request: DashboardProjectionRequest) {
    const event = createDashboardProjectionEvent(databaseName, request);
    await this.events.publish(event);
    return this.worker.process(databaseName, event);
  }

  async rebuildAll(databaseName: string) {
    const contexts = await this.repository.contexts(databaseName);
    for (const context of contexts) {
      await this.repository.rebuild(
        databaseName,
        Number(context.company_id),
        Number(context.financial_year_id),
        "billing.dashboard.bootstrap"
      );
    }
    return contexts.length;
  }
}

export const billingDashboardProjection = new DashboardService();
