import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { listProductLookups, listProducts } from "./product.services";
export const productsQueryKey = ["core", "master", "product"] as const;
export const productLookupsQueryKey = ["core", "master", "product", "lookups"] as const;
export function useProducts(search = "") {
  return useQuery({
    placeholderData: keepPreviousData,
    queryFn: () => listProducts(search),
    queryKey: [...productsQueryKey, "list", search]
  });
}
export function useProductLookups() {
  return useQuery({ queryFn: listProductLookups, queryKey: productLookupsQueryKey });
}
