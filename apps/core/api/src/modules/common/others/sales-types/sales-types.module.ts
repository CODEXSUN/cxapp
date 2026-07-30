import type { FastifyInstance } from "fastify";
import { registerSalesTypesRoutes } from "./sales-types.routes.js";

export const salesTypesModule = {
  key: "core.common.others.salesTypes",
  label: "Sales Types",
  register(app: FastifyInstance) {
    return registerSalesTypesRoutes(app);
  }
};
