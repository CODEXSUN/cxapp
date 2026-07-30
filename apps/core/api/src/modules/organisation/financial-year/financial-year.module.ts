import type { FastifyInstance } from "fastify";
import { registerFinancialYearRoutes } from "./financial-year.routes.js";
export const financialYearModule = {
  key: "core.organisation.financial-year",
  register(app: FastifyInstance) {
    return registerFinancialYearRoutes(app);
  }
};
