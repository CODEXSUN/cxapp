import type { FastifyInstance } from "fastify";
import { registerWarehousesRoutes } from "./warehouses.routes.js";

export const warehousesModule = {
  key: "core.common.workorder.warehouses",
  label: "Warehouses",
  register(app: FastifyInstance) {
    return registerWarehousesRoutes(app);
  }
};
