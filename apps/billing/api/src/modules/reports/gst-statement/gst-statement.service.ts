import { AppError } from "@codexsun/framework/errors";
import { GstStatementRepository } from "./gst-statement.repository.js";
import type { GstStatementQuery, GstStatementResult } from "./gst-statement.types.js";

export class GstStatementService {
  constructor(private readonly repository = new GstStatementRepository()) {}

  async get(databaseName: string, query: GstStatementQuery): Promise<GstStatementResult> {
    const context = await this.repository.context(databaseName, query.companyId);
    if (!context) {
      throw AppError.validation(
        "Configure an active Default Company and Financial Year before opening GST Statement."
      );
    }
    const from = query.from || context.financial_year_start;
    const to = query.to || context.financial_year_end;
    validateDates(from, to, context.financial_year_start, context.financial_year_end);
    const [items, summary] = await Promise.all([
      this.repository.lines(databaseName, context.company_id, from, to, query.page, query.pageSize),
      this.repository.summary(databaseName, context.company_id, from, to)
    ]);
    return {
      ...summary,
      companyId: context.company_id,
      companyName: context.company_name,
      financialYearId: context.financial_year_id,
      financialYearName: context.financial_year_name,
      from,
      items,
      page: query.page,
      pageSize: query.pageSize,
      to
    };
  }
}

function validateDates(from: string, to: string, yearStart: string, yearEnd: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    throw AppError.validation("GST Statement dates must use YYYY-MM-DD format.");
  }
  if (from > to) throw AppError.validation("GST Statement From date cannot be after To date.");
  if (from < yearStart || to > yearEnd)
    throw AppError.validation("GST Statement dates must stay inside the selected Financial Year.");
}
