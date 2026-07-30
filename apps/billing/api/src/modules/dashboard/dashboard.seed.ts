import { DashboardService } from "./dashboard.service.js";

export async function seedDashboardModule(databaseName: string) {
  const projectedContexts = await new DashboardService().rebuildAll(databaseName);
  return { projectedContexts, seeded: true };
}
