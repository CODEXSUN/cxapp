import type { FastifyInstance } from "fastify";
import { registerSupplierStatementRoutes } from "./supplier-statement.routes.js";

export const supplierStatementModule = {
  key: "billing.reports.supplier-statement",
  label: "Supplier Statement",
  register(app: FastifyInstance) {
    return registerSupplierStatementRoutes(app);
  }
};
