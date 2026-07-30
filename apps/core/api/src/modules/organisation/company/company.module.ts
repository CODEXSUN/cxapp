import type { FastifyInstance } from "fastify";
import { registerCompanyRoutes } from "./company.routes.js";

export const companyModule = {
  key: "core.organisation.company",
  register(app: FastifyInstance) {
    return registerCompanyRoutes(app);
  }
};
