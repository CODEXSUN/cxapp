import { useQuery } from "@tanstack/react-query";
import { listDestinations } from "./destinations.services";
import type { DestinationsListFilters } from "./destinations.types";

export const destinationsQueryKey = ["core", "common", "workorder", "destinations"] as const;
export function useDestinations(filters: DestinationsListFilters = {}) {
  return useQuery({
    queryFn: () => listDestinations(filters),
    queryKey: [...destinationsQueryKey, filters.search ?? ""]
  });
}
