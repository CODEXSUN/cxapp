import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createPlan, listPlans, updatePlan } from "./plan.services";
import type { PlanSavePayload } from "./plan.types";
export const planQueryKey = ["admin", "plans"] as const;
export function usePlansQuery() {
  return useQuery({ queryFn: listPlans, queryKey: planQueryKey });
}
export function usePlanMutations() {
  const client = useQueryClient();
  const done = () => client.invalidateQueries({ queryKey: planQueryKey });
  return {
    create: useMutation({ mutationFn: createPlan, onSuccess: done }),
    update: useMutation({
      mutationFn: ({ id, payload }: { id: number; payload: PlanSavePayload }) =>
        updatePlan(id, payload),
      onSuccess: done
    })
  };
}
