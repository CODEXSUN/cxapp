import { useQuery } from "@tanstack/react-query";
import { listProductGroups } from "./product-groups.services";
import type { ProductGroupsListFilters } from "./product-groups.types";

export const productGroupsQueryKey = ["core", "common", "products", "product-groups"] as const;
export function useProductGroups(filters: ProductGroupsListFilters = {}) {
  return useQuery({
    queryFn: () => listProductGroups(filters),
    queryKey: [...productGroupsQueryKey, filters.search ?? ""]
  });
}
