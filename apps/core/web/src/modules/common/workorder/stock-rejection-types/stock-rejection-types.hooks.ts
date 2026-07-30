import { useQuery } from "@tanstack/react-query";
import { listStockRejectionTypes } from "./stock-rejection-types.services";
import type { StockRejectionTypesListFilters } from "./stock-rejection-types.types";

export const stockRejectionTypesQueryKey = [
  "core",
  "common",
  "workorder",
  "stock-rejection-types"
] as const;
export function useStockRejectionTypes(filters: StockRejectionTypesListFilters = {}) {
  return useQuery({
    queryFn: () => listStockRejectionTypes(filters),
    queryKey: [...stockRejectionTypesQueryKey, filters.search ?? ""]
  });
}
