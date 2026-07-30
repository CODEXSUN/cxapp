import type { FastifyInstance } from "fastify";
import { registerPaymentRoutes } from "./payment.routes.js";
export const paymentModule = {
  key: "billing.payment",
  label: "Payment",
  capabilities: ["crud", "allocation", "activity", "worker", "sync"] as const,
  register(app: FastifyInstance) {
    return registerPaymentRoutes(app);
  }
};
