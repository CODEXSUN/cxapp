import { billingApiGet, billingApiPut } from "../../shared/api/billing-api";
import type { OpeningBalanceData, OpeningBalanceInput } from "./opening-balance.types";
export function getOpeningBalances() {
  return billingApiGet<OpeningBalanceData>("/billing/opening-balances");
}
export function saveOpeningBalance(input: OpeningBalanceInput) {
  return billingApiPut<OpeningBalanceData>("/billing/opening-balances", input);
}
