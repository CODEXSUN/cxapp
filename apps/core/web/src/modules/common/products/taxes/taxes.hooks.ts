import { useQuery } from "@tanstack/react-query";
import { listTaxes } from "./taxes.services";
import type { TaxesListFilters } from "./taxes.types";

export const taxesQueryKey = ["core", "common", "products", "taxes"] as const;
export function useTaxes(filters: TaxesListFilters = {}) {
  return useQuery({
    queryFn: () => listTaxes(filters),
    queryKey: [...taxesQueryKey, filters.search ?? ""]
  });
}
