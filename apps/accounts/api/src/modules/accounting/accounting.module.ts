import type { FastifyInstance } from "fastify";
import { registerAccountingRoutes } from "./accounting.routes.js";

export const accountingModule = {
  key: "accounts.accounting",
  label: "Accounting",
  register(app: FastifyInstance) {
    return registerAccountingRoutes(app);
  }
};