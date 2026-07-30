import { useQuery } from "@tanstack/react-query";
import { listBankNames } from "./bank-names.services";
import type { BankNamesListFilters } from "./bank-names.types";

export const bankNamesQueryKey = ["core", "common", "contacts", "bank-names"] as const;
export function useBankNames(filters: BankNamesListFilters = {}) {
  return useQuery({
    queryFn: () => listBankNames(filters),
    queryKey: [...bankNamesQueryKey, filters.search ?? ""]
  });
}
