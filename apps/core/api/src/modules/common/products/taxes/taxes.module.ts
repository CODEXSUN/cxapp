import type { FastifyInstance } from "fastify";
import { registerTaxesRoutes } from "./taxes.routes.js";

export const taxesModule = {
  key: "core.common.products.taxes",
  label: "Taxes",
  register(app: FastifyInstance) {
    return registerTaxesRoutes(app);
  }
};
