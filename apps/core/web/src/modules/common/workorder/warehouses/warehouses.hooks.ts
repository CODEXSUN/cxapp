import { useQuery } from "@tanstack/react-query";
import { listWarehouses } from "./warehouses.services";
import type { WarehousesListFilters } from "./warehouses.types";

export const warehousesQueryKey = ["core", "common", "workorder", "warehouses"] as const;
export function useWarehouses(filters: WarehousesListFilters = {}) {
  return useQuery({
    queryFn: () => listWarehouses(filters),
    queryKey: [...warehousesQueryKey, filters.search ?? ""]
  });
}
