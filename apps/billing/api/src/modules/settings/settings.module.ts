import type { FastifyInstance } from "fastify";
import { registerBillingSettingsRoutes } from "./settings.routes.js";

export const billingSettingsModule = {
  key: "billing.settings",
  label: "Billing Settings",
  register(app: FastifyInstance) {
    return registerBillingSettingsRoutes(app);
  }
};
