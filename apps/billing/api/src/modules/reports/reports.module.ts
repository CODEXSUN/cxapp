import type { FastifyInstance } from "fastify";
import { customerStatementModule } from "./customer-statement/index.js";
import { gstStatementModule } from "./gst-statement/index.js";
import { stockStatementModule } from "./stock-statement/index.js";
import { supplierStatementModule } from "./supplier-statement/index.js";

export const billingReportsModule = {
  key: "billing.reports",
  label: "Billing Reports",
  async register(app: FastifyInstance) {
    await customerStatementModule.register(app);
    await supplierStatementModule.register(app);
    await stockStatementModule.register(app);
    await gstStatementModule.register(app);
  }
};
