import { billingApiGet } from "../../../shared/api/billing-api";
import type { CustomerSummary } from "./customer-summary.types";

export function getCustomerSummary() {
  return billingApiGet<CustomerSummary>("/billing/reports/customer-summary");
}

export function formatCustomerSummaryMoney(value: number) {
  return new Intl.NumberFormat("en-IN", {
    currency: "INR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency"
  }).format(value);
}
