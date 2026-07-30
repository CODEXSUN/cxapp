import { billingApiGet } from "../../../shared/api/billing-api";
import type { CustomerStatement, CustomerStatementFilters } from "./customer-statement.types";

export function getCustomerStatement(filters: CustomerStatementFilters) {
  const query = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(filters.pageSize)
  });
  if (filters.contactId) query.set("contactId", String(filters.contactId));
  if (filters.from) query.set("from", filters.from);
  if (filters.to) query.set("to", filters.to);
  return billingApiGet<CustomerStatement>(`/billing/reports/customer-statement?${query}`);
}

export async function getCustomerStatementForPrint(
  filters: Omit<CustomerStatementFilters, "page" | "pageSize">
) {
  const first = await getCustomerStatement({ ...filters, page: 1, pageSize: 200 });
  const pageCount = Math.ceil(first.total / 200);
  const items = [...first.items];
  for (let page = 2; page <= pageCount; page += 1) {
    const statement = await getCustomerStatement({ ...filters, page, pageSize: 200 });
    items.push(...statement.items);
  }
  return { ...first, items, page: 1, pageSize: items.length };
}

export function formatCustomerStatementMoney(value: number) {
  return new Intl.NumberFormat("en-IN", {
    currency: "INR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency"
  }).format(value);
}

export function formatCustomerStatementDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }).format(date);
}
