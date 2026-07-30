import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  activateTenantPermission,
  createTenantPermission,
  deactivateTenantPermission,
  forceDeleteTenantPermission,
  listTenantPermissions,
  updateTenantPermission
} from "./tenant-permission.services";
import type { TenantPermission, TenantPermissionSavePayload } from "./tenant-permission.types";
export const tenantPermissionQueryKey = ["tenant", "access", "permissions"] as const;
export function useTenantPermissionsQuery() {
  return useQuery({ queryFn: () => listTenantPermissions(), queryKey: tenantPermissionQueryKey });
}
export function useTenantPermissionMutations() {
  const client = useQueryClient();
  const done = () => client.invalidateQueries({ queryKey: tenantPermissionQueryKey });
  return {
    activate: useMutation({
      mutationFn: (record: TenantPermission) => activateTenantPermission(record.id),
      onSuccess: done
    }),
    create: useMutation({ mutationFn: createTenantPermission, onSuccess: done }),
    deactivate: useMutation({
      mutationFn: (record: TenantPermission) => deactivateTenantPermission(record.id),
      onSuccess: done
    }),
    forceDelete: useMutation({
      mutationFn: (record: TenantPermission) => forceDeleteTenantPermission(record.id),
      onSuccess: done
    }),
    update: useMutation({
      mutationFn: ({ id, payload }: { id: number; payload: TenantPermissionSavePayload }) =>
        updateTenantPermission(id, payload),
      onSuccess: done
    })
  };
}
