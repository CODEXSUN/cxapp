import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { maintenanceNote } from "./master-database.schema";
import {
  getMasterDatabaseStatus,
  migrateMasterDatabase,
  requestMasterDatabaseBackup,
  requestMasterDatabaseRestore
} from "./master-database.services";

export const masterDatabaseQueryKey = ["admin", "database", "master"] as const;

export function useMasterDatabaseQuery() {
  return useQuery({
    queryFn: getMasterDatabaseStatus,
    queryKey: masterDatabaseQueryKey,
    refetchInterval: 15_000
  });
}

export function useMasterDatabaseMutations() {
  const client = useQueryClient();
  const done = () => client.invalidateQueries({ queryKey: masterDatabaseQueryKey });
  return {
    backup: useMutation({
      mutationFn: () => requestMasterDatabaseBackup(maintenanceNote("Master backup")),
      onSuccess: done
    }),
    migrate: useMutation({
      mutationFn: () => migrateMasterDatabase(maintenanceNote("Master migration")),
      onSuccess: done
    }),
    restore: useMutation({
      mutationFn: () => requestMasterDatabaseRestore(maintenanceNote("Master restore")),
      onSuccess: done
    })
  };
}
