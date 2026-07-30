import { useQuery } from "@tanstack/react-query";
import { listLedgerGroupLookups, listLedgers } from "./ledgers.services";
export const ledgersQueryKey = ["core", "common", "accounts", "ledgers"] as const;
export const ledgerGroupLookupsQueryKey = [...ledgersQueryKey, "ledger-groups"] as const;
export function useLedgers() {
  return useQuery({ queryKey: ledgersQueryKey, queryFn: () => listLedgers() });
}
export function useLedgerGroupLookups() {
  return useQuery({ queryKey: ledgerGroupLookupsQueryKey, queryFn: listLedgerGroupLookups });
}
