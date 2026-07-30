import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  activateTenantUserRole,
  createTenantUserRole,
  deactivateTenantUserRole,
  forceDeleteTenantUserRole,
  listUserOptions,
  listRoleOptions,
  listTenantUserRoles,
  updateTenantUserRole
} from "./tenant-user-role.services";
import type { TenantUserRole, TenantUserRoleSavePayload } from "./tenant-user-role.types";
export const tenantUserRoleQueryKey = ["tenant", "access", "user-roles"] as const;
export function useTenantUserRolesQuery() {
  return useQuery({ queryFn: () => listTenantUserRoles(), queryKey: tenantUserRoleQueryKey });
}
export function useTenantUserRoleLookups() {
  return useQuery({
    queryFn: async () => {
      const [first, second] = await Promise.all([listUserOptions(), listRoleOptions()]);
      return { first, second };
    },
    queryKey: [...tenantUserRoleQueryKey, "lookups"]
  });
}
export function useTenantUserRoleMutations() {
  const client = useQueryClient();
  const done = () => client.invalidateQueries({ queryKey: tenantUserRoleQueryKey });
  return {
    activate: useMutation({
      mutationFn: (record: TenantUserRole) => activateTenantUserRole(record.id),
      onSuccess: done
    }),
    create: useMutation({ mutationFn: createTenantUserRole, onSuccess: done }),
    deactivate: useMutation({
      mutationFn: (record: TenantUserRole) => deactivateTenantUserRole(record.id),
      onSuccess: done
    }),
    forceDelete: useMutation({
      mutationFn: (record: TenantUserRole) => forceDeleteTenantUserRole(record.id),
      onSuccess: done
    }),
    update: useMutation({
      mutationFn: ({ id, payload }: { id: number; payload: TenantUserRoleSavePayload }) =>
        updateTenantUserRole(id, payload),
      onSuccess: done
    })
  };
}
