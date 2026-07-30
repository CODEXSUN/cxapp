import { useQuery } from "@tanstack/react-query";
import { listLedgerGroups } from "./ledger-groups.services";
export const ledgerGroupsQueryKey = ["core", "common", "accounts", "ledger-groups"] as const;
export function useLedgerGroups() {
  return useQuery({ queryKey: ledgerGroupsQueryKey, queryFn: () => listLedgerGroups() });
}
