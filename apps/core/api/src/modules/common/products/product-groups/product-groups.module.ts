import type { FastifyInstance } from "fastify";
import { registerProductGroupsRoutes } from "./product-groups.routes.js";

export const productGroupsModule = {
  key: "core.common.products.productGroups",
  label: "Product Groups",
  register(app: FastifyInstance) {
    return registerProductGroupsRoutes(app);
  }
};
