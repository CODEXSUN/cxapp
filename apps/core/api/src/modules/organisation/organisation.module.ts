import type { FastifyInstance } from "fastify";
import { companyModule } from "./company/index.js";
import { defaultCompanyModule } from "./default-company/index.js";
import { financialYearModule } from "./financial-year/index.js";

export const organisationModule = {
  key: "core.organisation",
  label: "Organisation",
  async register(app: FastifyInstance) {
    await companyModule.register(app);
    await financialYearModule.register(app);
    await defaultCompanyModule.register(app);
  }
};
