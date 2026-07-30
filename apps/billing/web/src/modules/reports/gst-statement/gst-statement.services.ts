import { billingApiGet } from "../../../shared/api/billing-api";
import type { GstStatement, GstStatementFilters } from "./gst-statement.types";

export function getGstStatement(filters: GstStatementFilters) {
  const query = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(filters.pageSize)
  });
  if (filters.from) query.set("from", filters.from);
  if (filters.to) query.set("to", filters.to);
  return billingApiGet<GstStatement>(`/billing/reports/gst-statement?${query}`);
}

export async function getGstStatementForPrint(
  filters: Omit<GstStatementFilters, "page" | "pageSize">
) {
  const first = await getGstStatement({ ...filters, page: 1, pageSize: 200 });
  const pageCount = Math.ceil(first.total / 200);
  const items = [...first.items];
  for (let page = 2; page <= pageCount; page += 1) {
    const statement = await getGstStatement({ ...filters, page, pageSize: 200 });
    items.push(...statement.items);
  }
  return { ...first, items, page: 1, pageSize: items.length };
}

export function formatGstStatementMoney(value: number) {
  return new Intl.NumberFormat("en-IN", {
    currency: "INR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency"
  }).format(value);
}
