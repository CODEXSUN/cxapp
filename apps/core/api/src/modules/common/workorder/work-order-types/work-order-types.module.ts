import type { FastifyInstance } from "fastify";
import { registerWorkOrderTypesRoutes } from "./work-order-types.routes.js";

export const workOrderTypesModule = {
  key: "core.common.workorder.workOrderTypes",
  label: "Work Order Types",
  register(app: FastifyInstance) {
    return registerWorkOrderTypesRoutes(app);
  }
};
