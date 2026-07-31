import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  activateTenantUser,
  createTenantUser,
  deactivateTenantUser,
  forceDeleteTenantUser,
  listTenantUserTenants,
  listTenantUsers,
  updateTenantUser
} from "./tenant-user.services";
import type { TenantUser, TenantUserSavePayload, TenantUserScope } from "./tenant-user.types";
export const tenantUserQueryKey = ["tenant", "access", "users"] as const;
export const tenantUserTenantQueryKey = ["admin", "tenant-user", "tenants"] as const;

export function useTenantUserTenantsQuery(enabled: boolean) {
  return useQuery({ enabled, queryFn: listTenantUserTenants, queryKey: tenantUserTenantQueryKey });
}

export function useTenantUsersQuery(scope: TenantUserScope, enabled = true) {
  return useQuery({
    enabled,
    queryFn: () => listTenantUsers(scope),
    queryKey: queryKey(scope),
    retry: false
  });
}

export function useTenantUserMutations(scope: TenantUserScope) {
  const client = useQueryClient();
  const done = () => client.invalidateQueries({ queryKey: queryKey(scope) });
  return {
    activate: useMutation({
      mutationFn: (record: TenantUser) => activateTenantUser(scope, record.id),
      onSuccess: done
    }),
    create: useMutation({
      mutationFn: (payload: TenantUserSavePayload) => createTenantUser(scope, payload),
      onSuccess: done
    }),
    deactivate: useMutation({
      mutationFn: (record: TenantUser) => deactivateTenantUser(scope, record.id),
      onSuccess: done
    }),
    forceDelete: useMutation({
      mutationFn: (record: TenantUser) => forceDeleteTenantUser(scope, record.id),
      onSuccess: done
    }),
    update: useMutation({
      mutationFn: ({ id, payload }: { id: number; payload: TenantUserSavePayload }) =>
        updateTenantUser(scope, id, payload),
      onSuccess: done
    })
  };
}

function queryKey(scope: TenantUserScope) {
  return scope.desk === "sa"
    ? (["admin", "tenant-user", scope.tenantId, "users"] as const)
    : tenantUserQueryKey;
}
