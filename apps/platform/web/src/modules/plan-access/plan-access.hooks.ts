import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getPlanAccess, savePlanAccess } from "./plan-access.services";

export const planAccessQueryKey = (planId: number) => ["admin", "plan-access", planId] as const;

export function usePlanAccessQuery(planId: number) {
  return useQuery({
    enabled: planId > 0,
    queryFn: () => getPlanAccess(planId),
    queryKey: planAccessQueryKey(planId)
  });
}

export function usePlanAccessMutation(planId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (moduleKeys: string[]) => savePlanAccess(planId, { moduleKeys }),
    onSuccess: () => client.invalidateQueries({ queryKey: planAccessQueryKey(planId) })
  });
}
