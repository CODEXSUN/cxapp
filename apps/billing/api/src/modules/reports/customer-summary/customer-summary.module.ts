import type { FastifyInstance } from "fastify";
import { registerCustomerSummaryRoutes } from "./customer-summary.routes.js";

export const customerSummaryModule = {
  key: "billing.reports.customer-summary",
  label: "Customer Summary",
  register(app: FastifyInstance) {
    return registerCustomerSummaryRoutes(app);
  }
};
