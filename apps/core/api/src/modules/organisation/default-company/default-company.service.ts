import { AppError } from "@codexsun/framework/errors";
import { DefaultCompanyRepository } from "./default-company.repository.js";
import type { DefaultCompanySavePayload } from "./default-company.types.js";

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
    if (!/^[a-z][a-z0-9-]{1,79}$/.test(input.landingApp.trim()))
      throw AppError.validation("Select a valid landing app.");
    return this.repository.save(input);
  }
}
