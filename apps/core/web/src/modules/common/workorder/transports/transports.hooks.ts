import { useQuery } from "@tanstack/react-query";
import { listTransports } from "./transports.services";
import type { TransportsListFilters } from "./transports.types";

export const transportsQueryKey = ["core", "common", "workorder", "transports"] as const;
export function useTransports(filters: TransportsListFilters = {}) {
  return useQuery({
    queryFn: () => listTransports(filters),
    queryKey: [...transportsQueryKey, filters.search ?? ""]
  });
}
