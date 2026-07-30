import { useQuery } from "@tanstack/react-query";
import { listPriorities } from "./priorities.services";
import type { PrioritiesListFilters } from "./priorities.types";

export const prioritiesQueryKey = ["core", "common", "others", "priorities"] as const;
export function usePriorities(filters: PrioritiesListFilters = {}) {
  return useQuery({
    queryFn: () => listPriorities(filters),
    queryKey: [...prioritiesQueryKey, filters.search ?? ""]
  });
}
