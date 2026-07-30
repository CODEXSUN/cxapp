import { useQuery } from "@tanstack/react-query";
import { listCurrencies } from "./currencies.services";
import type { CurrenciesListFilters } from "./currencies.types";

export const currenciesQueryKey = ["core", "common", "others", "currencies"] as const;
export function useCurrencies(filters: CurrenciesListFilters = {}) {
  return useQuery({
    queryFn: () => listCurrencies(filters),
    queryKey: [...currenciesQueryKey, filters.search ?? ""]
  });
}
