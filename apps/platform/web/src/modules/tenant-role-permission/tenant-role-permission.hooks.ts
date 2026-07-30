import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  activateTenantRolePermission,
  createTenantRolePermission,
  deactivateTenantRolePermission,
  forceDeleteTenantRolePermission,
  listRoleOptions,
  listPermissionOptions,
  listTenantRolePermissions,
  updateTenantRolePermission
} from "./tenant-role-permission.services";
import type {
  TenantRolePermission,
  TenantRolePermissionSavePayload
} from "./tenant-role-permission.types";
export const tenantRolePermissionQueryKey = ["tenant", "access", "role-permissions"] as const;
export function useTenantRolePermissionsQuery() {
  return useQuery({
    queryFn: () => listTenantRolePermissions(),
    queryKey: tenantRolePermissionQueryKey
  });
}
export function useTenantRolePermissionLookups() {
  return useQuery({
    queryFn: async () => {
      const [first, second] = await Promise.all([listRoleOptions(), listPermissionOptions()]);
      return { first, second };
    },
    queryKey: [...tenantRolePermissionQueryKey, "lookups"]
  });
}
export function useTenantRolePermissionMutations() {
  const client = useQueryClient();
  const done = () => client.invalidateQueries({ queryKey: tenantRolePermissionQueryKey });
  return {
    activate: useMutation({
      mutationFn: (record: TenantRolePermission) => activateTenantRolePermission(record.id),
      onSuccess: done
    }),
    create: useMutation({ mutationFn: createTenantRolePermission, onSuccess: done }),
    deactivate: useMutation({
      mutationFn: (record: TenantRolePermission) => deactivateTenantRolePermission(record.id),
      onSuccess: done
    }),
    forceDelete: useMutation({
      mutationFn: (record: TenantRolePermission) => forceDeleteTenantRolePermission(record.id),
      onSuccess: done
    }),
    update: useMutation({
      mutationFn: ({ id, payload }: { id: number; payload: TenantRolePermissionSavePayload }) =>
        updateTenantRolePermission(id, payload),
      onSuccess: done
    })
  };
}
