import type { FastifyInstance } from "fastify";
import { registerLedgerGroupsRoutes } from "./ledger-groups.routes.js";
export const ledgerGroupsModule = {
  key: "core.common.accounts.ledger-groups",
  label: "Ledger Groups",
  register(app: FastifyInstance) {
    return registerLedgerGroupsRoutes(app);
  }
};
