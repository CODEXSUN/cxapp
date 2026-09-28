import { billingApiGet } from "../../../shared/api/billing-api";
import type { SupplierSummary } from "./supplier-summary.types";

export function getSupplierSummary() {
  return billingApiGet<SupplierSummary>("/billing/reports/supplier-summary");
}

export function formatSupplierSummaryMoney(value: number) {
  return new Intl.NumberFormat("en-IN", {
    currency: "INR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency"
  }).format(value);
}
