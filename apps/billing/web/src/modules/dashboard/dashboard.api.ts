import { billingApiGet } from "../../shared/api/billing-api";
import type { BillingDashboard } from "./dashboard.types";

export function getBillingDashboard() {
  return billingApiGet<BillingDashboard>("/billing/dashboard");
}
