import { AppError } from "@cxapp/framework/errors";
import { GstStatementRepository } from "./gst-statement.repository.js";
import type {
  GstStatementFilingPayload,
  GstStatementQuery,
  GstStatementResult
} from "./gst-statement.types.js";

export class GstStatementService {
  constructor(private readonly repository = new GstStatementRepository()) {}

  async get(databaseName: string, query: GstStatementQuery): Promise<GstStatementResult> {
    const context = await this.requireContext(databaseName, query.companyId);
    const period = resolvePeriod(
      query.year,
      query.month,
      context.financial_year_start,
      context.financial_year_end
    );
    const [sales, purchases, filing] = await Promise.all([
      this.repository.panel(databaseName, "sales", context.company_id, period.from, period.to),
      this.repository.panel(databaseName, "purchase", context.company_id, period.from, period.to),
      this.repository.filing(
        databaseName,
        context.company_id,
        context.financial_year_id,
        period.year,
        period.month
      )
    ]);
    const balance = money(filing.openingBalance + sales.taxAmount - purchases.taxAmount);
    return {
      availableYears: yearsBetween(context.financial_year_start, context.financial_year_end),
      companyGstin: context.company_gstin ?? "",
      companyId: context.company_id,
      companyName: context.company_name,
      filing,
      financialYearId: context.financial_year_id,
      financialYearName: context.financial_year_name,
      from: period.from,
      month: period.month,
      monthLabel: new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(
        new Date(Date.UTC(period.year, period.month - 1, 1))
      ),
      purchases,
      sales,
      summary: {
        balance,
        openingBalance: filing.openingBalance,
        purchaseTax: purchases.taxAmount,
        salesTax: sales.taxAmount
      },
      to: period.to,
      year: period.year
    };
  }

  async saveFiling(databaseName: string, input: GstStatementFilingPayload, companyId?: number) {
    const context = await this.requireContext(databaseName, companyId);
    resolvePeriod(
      input.year,
      input.month,
      context.financial_year_start,
      context.financial_year_end
    );
    if (!Number.isFinite(input.openingBalance))
      throw AppError.validation("GST opening balance must be a valid amount.");
    validateFiledDate(input.gstr1FiledOn, "GSTR-1");
    validateFiledDate(input.gstr3bFiledOn, "GSTR-3B");
    return this.repository.saveFiling(databaseName, context.company_id, context.financial_year_id, {
      ...input,
      gstr1Arn: cleanArn(input.gstr1Arn),
      gstr3bArn: cleanArn(input.gstr3bArn),
      openingBalance: money(input.openingBalance)
    });
  }

  private async requireContext(databaseName: string, companyId?: number) {
    const context = await this.repository.context(databaseName, companyId);
    if (!context) {
      throw AppError.validation(
        "Configure an active Default Company and Financial Year before opening GST Statement."
      );
    }
    return context;
  }
}

function resolvePeriod(
  year: number | undefined,
  month: number | undefined,
  start: string,
  end: string
) {
  const today = new Date();
  const requestedYear = year ?? today.getFullYear();
  const requestedMonth = month ?? today.getMonth() + 1;
  let resolvedYear = requestedYear;
  let resolvedMonth = requestedMonth;
  if (!year || !month) {
    const current = `${requestedYear}-${String(requestedMonth).padStart(2, "0")}-01`;
    if (current < start || current > end) {
      resolvedYear = Number(start.slice(0, 4));
      resolvedMonth = Number(start.slice(5, 7));
    }
  }
  if (!Number.isInteger(resolvedYear) || resolvedYear < 2000 || resolvedYear > 2200)
    throw AppError.validation("GST Statement year is invalid.");
  if (!Number.isInteger(resolvedMonth) || resolvedMonth < 1 || resolvedMonth > 12)
    throw AppError.validation("GST Statement month must be between 1 and 12.");
  const from = `${resolvedYear}-${String(resolvedMonth).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(resolvedYear, resolvedMonth, 0)).getUTCDate();
  const to = `${resolvedYear}-${String(resolvedMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  if (from < start || to > end)
    throw AppError.validation("Selected GST month must stay inside the active Financial Year.");
  return { from, month: resolvedMonth, to, year: resolvedYear };
}

function yearsBetween(start: string, end: string) {
  const first = Number(start.slice(0, 4));
  const last = Number(end.slice(0, 4));
  return Array.from({ length: last - first + 1 }, (_, index) => first + index);
}

function validateFiledDate(value: string | null, label: string) {
  if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw AppError.validation(`${label} filed date must use YYYY-MM-DD format.`);
}

function cleanArn(value: string) {
  return value.trim().toUpperCase();
}

function money(value: number) {
  return Math.round(value * 100) / 100;
}
