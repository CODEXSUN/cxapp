import type { FastifyInstance } from "fastify";
import { registerStylesRoutes } from "./styles.routes.js";

export const stylesModule = {
  key: "core.common.products.styles",
  label: "Styles",
  register(app: FastifyInstance) {
    return registerStylesRoutes(app);
  }
};
