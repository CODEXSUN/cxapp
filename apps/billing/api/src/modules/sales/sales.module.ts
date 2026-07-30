import type { FastifyInstance } from "fastify";
import { registerSalesRoutes } from "./sales.routes.js";

export const salesModule = {
  key: "billing.sales",
  label: "Sales",
  register(app: FastifyInstance) {
    return registerSalesRoutes(app);
  }
};
