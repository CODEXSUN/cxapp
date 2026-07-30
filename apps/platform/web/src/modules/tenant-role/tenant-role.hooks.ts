import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  activateTenantRole,
  createTenantRole,
  deactivateTenantRole,
  forceDeleteTenantRole,
  listTenantRoles,
  updateTenantRole
} from "./tenant-role.services";
import type { TenantRole, TenantRoleSavePayload } from "./tenant-role.types";
export const tenantRoleQueryKey = ["tenant", "access", "roles"] as const;
export function useTenantRolesQuery() {
  return useQuery({ queryFn: () => listTenantRoles(), queryKey: tenantRoleQueryKey });
}
export function useTenantRoleMutations() {
  const client = useQueryClient();
  const done = () => client.invalidateQueries({ queryKey: tenantRoleQueryKey });
  return {
    activate: useMutation({
      mutationFn: (record: TenantRole) => activateTenantRole(record.id),
      onSuccess: done
    }),
    create: useMutation({ mutationFn: createTenantRole, onSuccess: done }),
    deactivate: useMutation({
      mutationFn: (record: TenantRole) => deactivateTenantRole(record.id),
      onSuccess: done
    }),
    forceDelete: useMutation({
      mutationFn: (record: TenantRole) => forceDeleteTenantRole(record.id),
      onSuccess: done
    }),
    update: useMutation({
      mutationFn: ({ id, payload }: { id: number; payload: TenantRoleSavePayload }) =>
        updateTenantRole(id, payload),
      onSuccess: done
    })
  };
}
