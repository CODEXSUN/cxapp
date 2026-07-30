import { useQuery } from "@tanstack/react-query";
import { listUnits } from "./units.services";
import type { UnitsListFilters } from "./units.types";

export const unitsQueryKey = ["core", "common", "products", "units"] as const;
export function useUnits(filters: UnitsListFilters = {}) {
  return useQuery({
    queryFn: () => listUnits(filters),
    queryKey: [...unitsQueryKey, filters.search ?? ""]
  });
}
