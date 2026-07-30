import type { FastifyInstance } from "fastify";
import { registerPrioritiesRoutes } from "./priorities.routes.js";

export const prioritiesModule = {
  key: "core.common.others.priorities",
  label: "Priorities",
  register(app: FastifyInstance) {
    return registerPrioritiesRoutes(app);
  }
};
