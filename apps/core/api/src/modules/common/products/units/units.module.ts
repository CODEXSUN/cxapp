import type { FastifyInstance } from "fastify";
import { registerUnitsRoutes } from "./units.routes.js";

export const unitsModule = {
  key: "core.common.products.units",
  label: "Units",
  register(app: FastifyInstance) {
    return registerUnitsRoutes(app);
  }
};
