import type { FastifyInstance } from "fastify";
import { registerWorkOrderRoutes } from "./work-order.routes.js";
export const workOrderModule = {
  key: "core.master.work-order",
  register(app: FastifyInstance) {
    return registerWorkOrderRoutes(app);
  }
};
