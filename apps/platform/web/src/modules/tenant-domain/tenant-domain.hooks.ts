import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createTenantDomain,
  listAllTenantDomains,
  listTenantDomains,
  updateTenantDomain,
  updateTenantPrimaryDomain
} from "./tenant-domain.services";
import type { TenantDomainSavePayload } from "./tenant-domain.types";

export const tenantDomainQueryKey = ["admin", "tenant-domains"] as const;

export function tenantDomainMappingsQueryKey(tenantId: number) {
  return [...tenantDomainQueryKey, "tenant", tenantId] as const;
}

export function useTenantDomainsQuery() {
  return useQuery({ queryFn: listAllTenantDomains, queryKey: tenantDomainQueryKey });
}

export function useTenantDomainMappingsQuery(tenantId: number) {
  return useQuery({
    queryFn: () => listTenantDomains(tenantId),
    queryKey: tenantDomainMappingsQueryKey(tenantId)
  });
}

export function useTenantDomainControlMutations(tenantId: number) {
  const queryClient = useQueryClient();
  const done = async () => {
    await queryClient.invalidateQueries({ queryKey: tenantDomainQueryKey });
  };
  return {
    create: useMutation({
      mutationFn: (domain: string) => createTenantDomain({ domain, tenantId }),
      onSuccess: done
    }),
    setPrimary: useMutation({
      mutationFn: (domain: string) => updateTenantPrimaryDomain(tenantId, { domain }),
      onSuccess: done
    })
  };
}

export function useCreateTenantDomainMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTenantDomain,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tenantDomainQueryKey })
  });
}

export function useUpdateTenantDomainMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: TenantDomainSavePayload }) =>
      updateTenantDomain(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tenantDomainQueryKey })
  });
}
