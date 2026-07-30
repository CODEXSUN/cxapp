import type { FastifyInstance } from "fastify";
import { registerLedgersRoutes } from "./ledgers.routes.js";
export const ledgersModule = {
  key: "core.common.accounts.ledgers",
  label: "Ledgers",
  register(app: FastifyInstance) {
    return registerLedgersRoutes(app);
  }
};
