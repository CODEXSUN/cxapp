import { useQuery } from "@tanstack/react-query";
import { listTenantActivity, listTenants } from "./tenant.services";

export function useTenantsQuery() {
  return useQuery({
    queryKey: ["admin", "tenants"],
    queryFn: listTenants
  });
}

export function useTenantActivityQuery(id: string, enabled: boolean) {
  return useQuery({
    enabled,
    queryKey: ["admin", "activity", "tenant", id],
    queryFn: () => listTenantActivity(id)
  });
}
