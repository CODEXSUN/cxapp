import type { FastifyInstance } from "fastify";
import { registerCompanyRoutes } from "./company.routes.js";
import type { CompanyIndustryNameResolver } from "./company.types.js";

export const companyModule = {
  key: "core.organisation.company",
  register(app: FastifyInstance, industryNameResolver: CompanyIndustryNameResolver) {
    return registerCompanyRoutes(app, industryNameResolver);
  }
};
