import type { FastifyInstance } from "fastify";
import { registerCityRoutes } from "./city.routes.js";

export const cityModule = {
  key: "core.common.location.city",
  label: "City",
  register(app: FastifyInstance) {
    return registerCityRoutes(app);
  }
};
