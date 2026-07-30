import { useQuery } from "@tanstack/react-query";
import { listMonths } from "./months.services";
import type { MonthsListFilters } from "./months.types";

export const monthsQueryKey = ["core", "common", "others", "months"] as const;
export function useMonths(filters: MonthsListFilters = {}) {
  return useQuery({
    queryFn: () => listMonths(filters),
    queryKey: [...monthsQueryKey, filters.search ?? ""]
  });
}
