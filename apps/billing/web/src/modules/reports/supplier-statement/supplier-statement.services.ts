import { billingApiGet } from "../../../shared/api/billing-api";
import type { SupplierStatement, SupplierStatementFilters } from "./supplier-statement.types";

export function getSupplierStatement(filters: SupplierStatementFilters) {
  const query = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(filters.pageSize)
  });
  if (filters.contactId) query.set("contactId", String(filters.contactId));
  if (filters.from) query.set("from", filters.from);
  if (filters.to) query.set("to", filters.to);
  return billingApiGet<SupplierStatement>(`/billing/reports/supplier-statement?${query}`);
}

export async function getSupplierStatementForPrint(
  filters: Omit<SupplierStatementFilters, "page" | "pageSize">
) {
  const first = await getSupplierStatement({ ...filters, page: 1, pageSize: 200 });
  const pageCount = Math.ceil(first.total / 200);
  const items = [...first.items];
  for (let page = 2; page <= pageCount; page += 1) {
    const statement = await getSupplierStatement({ ...filters, page, pageSize: 200 });
    items.push(...statement.items);
  }
  return { ...first, items, page: 1, pageSize: items.length };
}

export function formatSupplierStatementMoney(value: number) {
  return new Intl.NumberFormat("en-IN", {
    currency: "INR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency"
  }).format(value);
}

export function formatSupplierStatementDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }).format(date);
}
