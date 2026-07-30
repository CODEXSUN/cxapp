import type { FastifyInstance } from "fastify";
import { registerExportSalesRoutes } from "./export-sales.routes.js";

export const exportSalesModule = {
  key: "billing.export-sales",
  label: "Export Sales",
  register(app: FastifyInstance) {
    return registerExportSalesRoutes(app);
  }
};
