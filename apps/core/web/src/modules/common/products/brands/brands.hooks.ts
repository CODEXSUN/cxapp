import { useQuery } from "@tanstack/react-query";
import { listBrands } from "./brands.services";
import type { BrandsListFilters } from "./brands.types";

export const brandsQueryKey = ["core", "common", "products", "brands"] as const;
export function useBrands(filters: BrandsListFilters = {}) {
  return useQuery({
    queryFn: () => listBrands(filters),
    queryKey: [...brandsQueryKey, filters.search ?? ""]
  });
}
