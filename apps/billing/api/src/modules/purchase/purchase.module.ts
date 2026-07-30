import type { FastifyInstance } from "fastify";
import { registerPurchaseRoutes } from "./purchase.routes.js";

export const purchaseModule = {
  key: "billing.purchase",
  label: "Purchase",
  register(app: FastifyInstance) {
    return registerPurchaseRoutes(app);
  }
};
