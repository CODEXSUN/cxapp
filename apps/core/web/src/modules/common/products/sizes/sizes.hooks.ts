import { useQuery } from "@tanstack/react-query";
import { listSizes } from "./sizes.services";
import type { SizesListFilters } from "./sizes.types";

export const sizesQueryKey = ["core", "common", "products", "sizes"] as const;
export function useSizes(filters: SizesListFilters = {}) {
  return useQuery({
    queryFn: () => listSizes(filters),
    queryKey: [...sizesQueryKey, filters.search ?? ""]
  });
}
