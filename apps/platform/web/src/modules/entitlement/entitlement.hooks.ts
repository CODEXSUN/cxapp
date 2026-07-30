import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createEntitlement, listEntitlements, updateEntitlement } from "./entitlement.services";
import type { EntitlementSavePayload } from "./entitlement.types";

export const entitlementQueryKey = ["admin", "entitlements"] as const;

export function useEntitlementsQuery() {
  return useQuery({ queryFn: listEntitlements, queryKey: entitlementQueryKey });
}

export function useEntitlementMutations() {
  const client = useQueryClient();
  const done = () => client.invalidateQueries({ queryKey: entitlementQueryKey });

  return {
    create: useMutation({ mutationFn: createEntitlement, onSuccess: done }),
    update: useMutation({
      mutationFn: ({ id, payload }: { id: number; payload: EntitlementSavePayload }) =>
        updateEntitlement(id, payload),
      onSuccess: done
    })
  };
}
