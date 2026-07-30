import type { FastifyInstance } from "fastify";
import { registerStateRoutes } from "./state.routes.js";

export const stateModule = {
  key: "core.common.location.state",
  label: "State",
  register(app: FastifyInstance) {
    return registerStateRoutes(app);
  }
};
