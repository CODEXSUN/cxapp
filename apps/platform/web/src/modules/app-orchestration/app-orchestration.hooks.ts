import { useQuery } from "@tanstack/react-query";
import { listOrchestratedApps } from "./app-orchestration.services";
export const appOperationsKey = ["sa", "app-operations"] as const;
export function useAppOperationsQuery() {
  return useQuery({
    queryKey: appOperationsKey,
    queryFn: listOrchestratedApps,
    refetchInterval: 5000
  });
}
