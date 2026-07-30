import { useQuery } from "@tanstack/react-query";
import { listProductTypes } from "./product-types.services";
import type { ProductTypesListFilters } from "./product-types.types";

export const productTypesQueryKey = ["core", "common", "products", "product-types"] as const;
export function useProductTypes(filters: ProductTypesListFilters = {}) {
  return useQuery({
    queryFn: () => listProductTypes(filters),
    queryKey: [...productTypesQueryKey, filters.search ?? ""]
  });
}
