import type { FastifyInstance } from "fastify";
import { registerDestinationsRoutes } from "./destinations.routes.js";

export const destinationsModule = {
  key: "core.common.workorder.destinations",
  label: "Destinations",
  register(app: FastifyInstance) {
    return registerDestinationsRoutes(app);
  }
};
