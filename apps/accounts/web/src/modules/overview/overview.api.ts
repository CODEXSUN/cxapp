import { accountsApiGet } from "../../shared/api/accounts-api";
import type { AccountsOverview } from "./overview.types";

export function getAccountsOverview() {
  return accountsApiGet<AccountsOverview>("/accounts/overview");
}