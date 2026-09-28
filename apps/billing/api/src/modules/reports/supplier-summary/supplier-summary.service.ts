import { AppError } from "@cxapp/framework/errors";
import { SupplierSummaryRepository } from "./supplier-summary.repository.js";
import type { SupplierSummaryResult } from "./supplier-summary.types.js";

export class SupplierSummaryService {
  constructor(private readonly repository = new SupplierSummaryRepository()) {}

  async get(databaseName: string, companyId?: number): Promise<SupplierSummaryResult> {
    const context = await this.repository.context(databaseName, companyId);
    if (!context) {
      throw AppError.validation(
        "Configure an active Default Company and Financial Year before opening Supplier Summary."
      );
    }
    const items = await this.repository.summary(databaseName, context.company_id);
    return {
      companyId: context.company_id,
      companyName: context.company_name,
      financialYearId: context.financial_year_id,
      financialYearName: context.financial_year_name,
      items,
      total: items.length,
      totalBalance: money(items.reduce((total, item) => total + item.balance, 0)),
      totalCredit: money(items.reduce((total, item) => total + item.credit, 0)),
      totalDebit: money(items.reduce((total, item) => total + item.debit, 0))
    };
  }
}

function money(value: number) {
  return Math.round(value * 100) / 100;
}
