import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  activateTenantUser,
  createTenantUser,
  deactivateTenantUser,
  forceDeleteTenantUser,
  listTenantUsers,
  updateTenantUser
} from "./tenant-user.services";
import type { TenantUser, TenantUserSavePayload } from "./tenant-user.types";
export const tenantUserQueryKey = ["tenant", "access", "users"] as const;
export function useTenantUsersQuery() {
  return useQuery({ queryFn: () => listTenantUsers(), queryKey: tenantUserQueryKey });
}
export function useTenantUserMutations() {
  const client = useQueryClient();
  const done = () => client.invalidateQueries({ queryKey: tenantUserQueryKey });
  return {
    activate: useMutation({
      mutationFn: (record: TenantUser) => activateTenantUser(record.id),
      onSuccess: done
    }),
    create: useMutation({ mutationFn: createTenantUser, onSuccess: done }),
    deactivate: useMutation({
      mutationFn: (record: TenantUser) => deactivateTenantUser(record.id),
      onSuccess: done
    }),
    forceDelete: useMutation({
      mutationFn: (record: TenantUser) => forceDeleteTenantUser(record.id),
      onSuccess: done
    }),
    update: useMutation({
      mutationFn: ({ id, payload }: { id: number; payload: TenantUserSavePayload }) =>
        updateTenantUser(id, payload),
      onSuccess: done
    })
  };
}
