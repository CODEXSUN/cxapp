import type { FastifyInstance } from "fastify";
import { registerSizesRoutes } from "./sizes.routes.js";

export const sizesModule = {
  key: "core.common.products.sizes",
  label: "Sizes",
  register(app: FastifyInstance) {
    return registerSizesRoutes(app);
  }
};
