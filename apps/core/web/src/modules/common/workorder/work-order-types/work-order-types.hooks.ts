import { useQuery } from "@tanstack/react-query";
import { listWorkOrderTypes } from "./work-order-types.services";
import type { WorkOrderTypesListFilters } from "./work-order-types.types";

export const workOrderTypesQueryKey = ["core", "common", "workorder", "work-order-types"] as const;
export function useWorkOrderTypes(filters: WorkOrderTypesListFilters = {}) {
  return useQuery({
    queryFn: () => listWorkOrderTypes(filters),
    queryKey: [...workOrderTypesQueryKey, filters.search ?? ""]
  });
}
