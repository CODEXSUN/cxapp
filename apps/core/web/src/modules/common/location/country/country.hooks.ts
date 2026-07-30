import { useQuery } from "@tanstack/react-query";
import { listCountries } from "./country.services";
import type { CountryListFilters } from "./country.types";

export const countryQueryKey = ["core", "common", "location", "country"] as const;

export function useCountries(filters: CountryListFilters = {}) {
  return useQuery({
    queryFn: () => listCountries(filters),
    queryKey: [...countryQueryKey, filters.search ?? ""]
  });
}
