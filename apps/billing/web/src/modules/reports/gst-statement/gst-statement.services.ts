import { billingApiGet, billingApiPut } from "../../../shared/api/billing-api";
import type {
  GstStatement,
  GstStatementFiling,
  GstStatementFilingPayload,
  GstStatementFilters
} from "./gst-statement.types";

export function getGstStatement(filters: GstStatementFilters) {
  const query = new URLSearchParams();
  if (filters.month) query.set("month", String(filters.month));
  if (filters.year) query.set("year", String(filters.year));
  const suffix = query.size ? `?${query}` : "";
  return billingApiGet<GstStatement>(`/billing/reports/gst-statement${suffix}`);
}

export function saveGstStatementFiling(payload: GstStatementFilingPayload) {
  return billingApiPut<GstStatementFiling>("/billing/reports/gst-statement/filing", payload);
}

export function formatGstStatementMoney(value: number) {
  return new Intl.NumberFormat("en-IN", {
    currency: "INR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency"
  }).format(value);
}

export function formatGstQuantity(value: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 4 }).format(value);
}
