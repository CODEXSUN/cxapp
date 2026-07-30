import type { FastifyInstance } from "fastify";
import { registerReceiptRoutes } from "./receipt.routes.js";
export const receiptModule = {
  key: "billing.receipt",
  label: "Receipt",
  capabilities: ["crud", "allocation", "activity", "worker", "sync"] as const,
  register(app: FastifyInstance) {
    return registerReceiptRoutes(app);
  }
};
