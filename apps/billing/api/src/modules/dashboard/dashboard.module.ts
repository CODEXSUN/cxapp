import type { FastifyInstance } from "fastify";
import { registerDashboardRoutes } from "./dashboard.routes.js";

export const dashboardModule = {
  key: "billing.dashboard",
  label: "Billing Dashboard",
  register(app: FastifyInstance) {
    return registerDashboardRoutes(app);
  }
};
