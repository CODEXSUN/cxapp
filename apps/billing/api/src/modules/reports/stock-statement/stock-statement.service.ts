import { AppError } from "@codexsun/framework/errors";
import { StockStatementRepository } from "./stock-statement.repository.js";
import type { StockStatementQuery, StockStatementResult } from "./stock-statement.types.js";

export class StockStatementService {
  constructor(private readonly repository = new StockStatementRepository()) {}

  async get(databaseName: string, query: StockStatementQuery): Promise<StockStatementResult> {
    const context = await this.repository.context(databaseName, query.companyId);
    if (!context) {
      throw AppError.validation(
        "Configure an active Default Company and Financial Year before opening Stock Statement."
      );
    }
    const from = query.from || context.financial_year_start;
    const to = query.to || context.financial_year_end;
    validateDates(from, to, context.financial_year_start, context.financial_year_end);
    const normalized = {
      companyId: context.company_id,
      from,
      page: query.page,
      pageSize: query.pageSize,
      search: query.search.trim(),
      to
    };
    const [items, summary, total] = await Promise.all([
      this.repository.lines(databaseName, normalized),
      this.repository.summary(databaseName, normalized.companyId, from, to, normalized.search),
      this.repository.count(databaseName, normalized.search)
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
      search: normalized.search,
      to,
      total
    };
  }
}

function validateDates(from: string, to: string, yearStart: string, yearEnd: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    throw AppError.validation("Stock Statement dates must use YYYY-MM-DD format.");
  }
  if (from > to) throw AppError.validation("Stock Statement From date cannot be after To date.");
  if (from < yearStart || to > yearEnd)
    throw AppError.validation("Stock Statement dates must stay inside the selected Financial Year.");
}
