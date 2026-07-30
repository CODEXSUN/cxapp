import type { FastifyInstance } from "fastify";
import { registerDefaultCompanyRoutes } from "./default-company.routes.js";
export const defaultCompanyModule = {
  key: "core.organisation.default-company",
  register(app: FastifyInstance) {
    return registerDefaultCompanyRoutes(app);
  }
};
