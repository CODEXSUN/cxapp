import { useQuery } from "@tanstack/react-query";
import { listColours } from "./colours.services";
import type { ColoursListFilters } from "./colours.types";

export const coloursQueryKey = ["core", "common", "products", "colours"] as const;
export function useColours(filters: ColoursListFilters = {}) {
  return useQuery({
    queryFn: () => listColours(filters),
    queryKey: [...coloursQueryKey, filters.search ?? ""]
  });
}
