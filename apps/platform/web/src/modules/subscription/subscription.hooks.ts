import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createSubscription, listSubscriptions, updateSubscription } from "./subscription.services";
import type { SubscriptionSavePayload } from "./subscription.types";
export const subscriptionQueryKey = ["admin", "subscriptions"] as const;
export function useSubscriptionsQuery() {
  return useQuery({ queryFn: listSubscriptions, queryKey: subscriptionQueryKey });
}
export function useSubscriptionMutations() {
  const client = useQueryClient();
  const done = () => client.invalidateQueries({ queryKey: subscriptionQueryKey });
  return {
    create: useMutation({ mutationFn: createSubscription, onSuccess: done }),
    update: useMutation({
      mutationFn: ({ id, payload }: { id: number; payload: SubscriptionSavePayload }) =>
        updateSubscription(id, payload),
      onSuccess: done
    })
  };
}
