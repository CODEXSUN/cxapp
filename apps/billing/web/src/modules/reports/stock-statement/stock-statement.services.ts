import { billingApiGet } from "../../../shared/api/billing-api";
import type { StockStatement, StockStatementFilters } from "./stock-statement.types";

export function getStockStatement(filters: StockStatementFilters) {
  const query = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(filters.pageSize),
    search: filters.search
  });
  if (filters.from) query.set("from", filters.from);
  if (filters.to) query.set("to", filters.to);
  return billingApiGet<StockStatement>(`/billing/reports/stock-statement?${query}`);
}

export async function getStockStatementForPrint(
  filters: Omit<StockStatementFilters, "page" | "pageSize">
) {
  const first = await getStockStatement({ ...filters, page: 1, pageSize: 200 });
  const pageCount = Math.ceil(first.total / 200);
  const items = [...first.items];
  for (let page = 2; page <= pageCount; page += 1) {
    const statement = await getStockStatement({ ...filters, page, pageSize: 200 });
    items.push(...statement.items);
  }
  return { ...first, items, page: 1, pageSize: items.length };
}

export function formatStockStatementMoney(value: number) {
  return new Intl.NumberFormat("en-IN", {
    currency: "INR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency"
  }).format(value);
}

export function formatStockQuantity(value: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 4 }).format(value);
}
