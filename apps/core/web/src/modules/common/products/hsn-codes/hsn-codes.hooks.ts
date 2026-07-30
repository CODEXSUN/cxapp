import { useQuery } from "@tanstack/react-query";
import { listHsnCodes } from "./hsn-codes.services";
import type { HsnCodesListFilters } from "./hsn-codes.types";

export const hsnCodesQueryKey = ["core", "common", "products", "hsn-codes"] as const;
export function useHsnCodes(filters: HsnCodesListFilters = {}) {
  return useQuery({
    queryFn: () => listHsnCodes(filters),
    queryKey: [...hsnCodesQueryKey, filters.search ?? ""]
  });
}
