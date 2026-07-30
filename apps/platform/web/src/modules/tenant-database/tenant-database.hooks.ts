import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tenantMaintenanceNote } from "./tenant-database.schema";
import {
  getTenantDatabaseDetails,
  listTenantDatabaseStatus,
  migrateTenantDatabase,
  reinstallTenantDatabase,
  requestTenantDatabaseBackup,
  requestTenantDatabaseRestore,
  setupTenantDatabase
} from "./tenant-database.services";

export const tenantDatabaseQueryKey = ["admin", "database", "tenants"] as const;

export function useTenantDatabaseQuery() {
  return useQuery({
    queryFn: listTenantDatabaseStatus,
    queryKey: tenantDatabaseQueryKey,
    meta: { suppressGlobalLoader: true },
    refetchInterval: 15_000
  });
}

export function useTenantDatabaseDetailsQuery(tenantId: number | null) {
  return useQuery({
    enabled: tenantId !== null,
    queryFn: () => getTenantDatabaseDetails(tenantId ?? 0),
    queryKey: [...tenantDatabaseQueryKey, tenantId, "details"],
    meta: { suppressGlobalLoader: true },
    refetchInterval: 15_000
  });
}

export function useTenantDatabaseMutations() {
  const client = useQueryClient();
  const done = () => {
    void client.invalidateQueries({ queryKey: tenantDatabaseQueryKey });
  };
  return {
    backup: useMutation({
      mutationFn: (tenantId: number) =>
        requestTenantDatabaseBackup(tenantId, tenantMaintenanceNote(tenantId, "Tenant backup")),
      onSuccess: done
    }),
    migrate: useMutation({
      mutationFn: (tenantId: number) =>
        migrateTenantDatabase(tenantId, tenantMaintenanceNote(tenantId, "Tenant migration")),
      onSuccess: done
    }),
    reinstall: useMutation({
      mutationFn: (tenantId: number) =>
        reinstallTenantDatabase(
          tenantId,
          tenantMaintenanceNote(tenantId, "Tenant database re-install")
        ),
      onSuccess: done
    }),
    restore: useMutation({
      mutationFn: (tenantId: number) =>
        requestTenantDatabaseRestore(tenantId, tenantMaintenanceNote(tenantId, "Tenant restore")),
      onSuccess: done
    }),
    setup: useMutation({
      mutationFn: (tenantId: number) =>
        setupTenantDatabase(tenantId, tenantMaintenanceNote(tenantId, "Tenant database setup")),
      onSuccess: done
    })
  };
}
