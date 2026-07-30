import { useQuery } from "@tanstack/react-query";
import { listSalesTypes } from "./sales-types.services";
import type { SalesTypesListFilters } from "./sales-types.types";

export const salesTypesQueryKey = ["core", "common", "others", "sales-types"] as const;
export function useSalesTypes(filters: SalesTypesListFilters = {}) {
  return useQuery({
    queryFn: () => listSalesTypes(filters),
    queryKey: [...salesTypesQueryKey, filters.search ?? ""]
  });
}
