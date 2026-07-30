import { useQuery } from "@tanstack/react-query";
import { listTenantAccess } from "./tenant-access.services";

export const tenantAccessQueryKey = ["admin", "tenant-access"] as const;

export function useTenantAccessQuery() {
  return useQuery({ queryFn: listTenantAccess, queryKey: tenantAccessQueryKey });
}
