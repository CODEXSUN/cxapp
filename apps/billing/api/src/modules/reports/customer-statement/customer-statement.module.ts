import type { FastifyInstance } from "fastify";
import { registerCustomerStatementRoutes } from "./customer-statement.routes.js";

export const customerStatementModule = {
  key: "billing.reports.customer-statement",
  label: "Customer Statement",
  register(app: FastifyInstance) {
    return registerCustomerStatementRoutes(app);
  }
};
