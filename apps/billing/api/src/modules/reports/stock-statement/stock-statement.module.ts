import type { FastifyInstance } from "fastify";
import { registerStockStatementRoutes } from "./stock-statement.routes.js";

export const stockStatementModule = {
  key: "billing.reports.stock-statement",
  label: "Stock Statement",
  register(app: FastifyInstance) {
    return registerStockStatementRoutes(app);
  }
};
