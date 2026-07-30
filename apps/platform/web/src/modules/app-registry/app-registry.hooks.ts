import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createPlatformApp, listPlatformApps, updatePlatformApp } from "./app-registry.services";
import type { PlatformAppSavePayload } from "./app-registry.types";
export const appRegistryQueryKey = ["admin", "apps"] as const;
export function usePlatformAppsQuery() {
  return useQuery({ queryFn: listPlatformApps, queryKey: appRegistryQueryKey });
}
export function usePlatformAppMutations() {
  const client = useQueryClient();
  const done = () => client.invalidateQueries({ queryKey: appRegistryQueryKey });
  return {
    create: useMutation({ mutationFn: createPlatformApp, onSuccess: done }),
    update: useMutation({
      mutationFn: ({ id, payload }: { id: number; payload: PlatformAppSavePayload }) =>
        updatePlatformApp(id, payload),
      onSuccess: done
    })
  };
}
