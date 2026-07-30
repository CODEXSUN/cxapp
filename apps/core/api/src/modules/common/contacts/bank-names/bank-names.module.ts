import type { FastifyInstance } from "fastify";
import { registerBankNamesRoutes } from "./bank-names.routes.js";

export const bankNamesModule = {
  key: "core.common.contacts.bankNames",
  label: "Bank Names",
  register(app: FastifyInstance) {
    return registerBankNamesRoutes(app);
  }
};
