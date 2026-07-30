import { AppError } from "@cxapp/framework/errors";
import { runWithCoreDatabase } from "../../../database/core-database.js";
import { DefaultCompanyRepository } from "./default-company.repository.js";
import type { DefaultCompanySavePayload } from "./default-company.types.js";

const landingApps = new Set(["application", "billing", "mail", "task-manager"]);

export class DefaultCompanyService {
  constructor(private readonly repository = new DefaultCompanyRepository()) {}
  get() {
    return this.repository.get();
  }
  companyLookups() {
    return this.repository.companyLookups();
  }
  financialYearLookups() {
    return this.repository.financialYearLookups();
  }
  async save(input: DefaultCompanySavePayload) {
    if (!(await this.repository.findCompany(input.companyId)))
      throw AppError.validation("Selected company was not found or is inactive.");
    if (!(await this.repository.findFinancialYear(input.financialYearId)))
      throw AppError.validation("Selected financial year was not found or is inactive.");
    if (!landingApps.has(input.landingApp.trim()))
      throw AppError.validation("Select a valid landing app.");
    return this.repository.save(input);
  }
}

export function getDefaultCompanyForDatabase(databaseName: string) {
  return runWithCoreDatabase(databaseName, () => new DefaultCompanyService().get());
}

export function setDefaultCompanyLandingAppForDatabase(databaseName: string, landingApp: string) {
  return runWithCoreDatabase(databaseName, async () => {
    const service = new DefaultCompanyService();
    const current = await service.get();
    if (!current) {
      throw AppError.conflict(
        "Configure Default Company before selecting the tenant landing application."
      );
    }
    return service.save({
      companyId: current.companyId,
      financialYearId: current.financialYearId,
      landingApp,
      status: current.status
    });
  });
}
