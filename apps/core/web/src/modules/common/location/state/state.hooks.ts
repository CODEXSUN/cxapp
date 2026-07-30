import { useQuery } from "@tanstack/react-query";
import { listStateCountryOptions, listStates } from "./state.services";
import type { StateListFilters } from "./state.types";

export const stateQueryKey = ["core", "common", "location", "state"] as const;

export function useStates(filters: StateListFilters = {}) {
  return useQuery({
    queryFn: () => listStates(filters),
    queryKey: [...stateQueryKey, filters.countryId ?? "", filters.search ?? ""]
  });
}

export function useStateCountryOptions() {
  return useQuery({
    queryFn: listStateCountryOptions,
    queryKey: ["core", "common", "location", "state", "country-options"]
  });
}
