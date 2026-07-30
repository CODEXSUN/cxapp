import type { FastifyInstance } from "fastify";
import { registerProductRoutes } from "./product.routes.js";
export const productModule = {
  key: "core.master.product",
  register(app: FastifyInstance) {
    return registerProductRoutes(app);
  }
};
