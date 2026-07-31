import type { FastifyInstance } from "fastify";
import { companyModule } from "./company/index.js";
import { defaultCompanyModule } from "./default-company/index.js";
import { financialYearModule } from "./financial-year/index.js";
import type { CompanyIndustryNameResolver } from "./company/index.js";

export const organisationModule = {
  key: "core.organisation",
  label: "Organisation",
  async register(app: FastifyInstance, industryNameResolver: CompanyIndustryNameResolver) {
    await companyModule.register(app, industryNameResolver);
    await financialYearModule.register(app);
    await defaultCompanyModule.register(app);
  }
};
