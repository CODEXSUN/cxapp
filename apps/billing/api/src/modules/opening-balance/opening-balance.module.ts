import type { FastifyInstance } from "fastify";
import { registerOpeningBalanceRoutes } from "./opening-balance.routes.js";

export const openingBalanceModule = {
  key: "billing.opening-balance",
  label: "Opening Balances",
  // Financial configuration has audited replacement, not deletion or background jobs.
  register(app: FastifyInstance) {
    return registerOpeningBalanceRoutes(app);
  }
};
