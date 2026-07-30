import type { FastifyInstance } from "fastify";
import { registerGstStatementRoutes } from "./gst-statement.routes.js";

export const gstStatementModule = {
  key: "billing.reports.gst-statement",
  label: "GST Statement",
  register(app: FastifyInstance) {
    return registerGstStatementRoutes(app);
  }
};
