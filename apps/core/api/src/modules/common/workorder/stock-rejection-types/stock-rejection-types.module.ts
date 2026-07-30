import type { FastifyInstance } from "fastify";
import { registerStockRejectionTypesRoutes } from "./stock-rejection-types.routes.js";

export const stockRejectionTypesModule = {
  key: "core.common.workorder.stockRejectionTypes",
  label: "Stock Rejection Types",
  register(app: FastifyInstance) {
    return registerStockRejectionTypesRoutes(app);
  }
};
