import type { FastifyInstance } from "fastify";
import { registerColoursRoutes } from "./colours.routes.js";

export const coloursModule = {
  key: "core.common.products.colours",
  label: "Colours",
  register(app: FastifyInstance) {
    return registerColoursRoutes(app);
  }
};
