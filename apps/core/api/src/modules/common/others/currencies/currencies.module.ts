import type { FastifyInstance } from "fastify";
import { registerCurrenciesRoutes } from "./currencies.routes.js";

export const currenciesModule = {
  key: "core.common.others.currencies",
  label: "Currencies",
  register(app: FastifyInstance) {
    return registerCurrenciesRoutes(app);
  }
};
