import { useQuery } from "@tanstack/react-query";
import { listProductCategories } from "./product-categories.services";
import type { ProductCategoriesListFilters } from "./product-categories.types";

export const productCategoriesQueryKey = [
  "core",
  "common",
  "products",
  "product-categories"
] as const;
export function useProductCategories(filters: ProductCategoriesListFilters = {}) {
  return useQuery({
    queryFn: () => listProductCategories(filters),
    queryKey: [...productCategoriesQueryKey, filters.search ?? ""]
  });
}
