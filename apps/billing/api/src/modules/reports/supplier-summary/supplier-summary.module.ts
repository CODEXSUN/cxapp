import type { FastifyInstance } from "fastify";
import { registerSupplierSummaryRoutes } from "./supplier-summary.routes.js";

export const supplierSummaryModule = {
  key: "billing.reports.supplier-summary",
  label: "Supplier Summary",
  register(app: FastifyInstance) {
    return registerSupplierSummaryRoutes(app);
  }
};
