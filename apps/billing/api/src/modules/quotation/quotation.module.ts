import type { FastifyInstance } from "fastify";
import { registerQuotationRoutes } from "./quotation.routes.js";

export const quotationModule = {
  key: "billing.quotation",
  label: "Quotation",
  register(app: FastifyInstance) {
    return registerQuotationRoutes(app);
  }
};
