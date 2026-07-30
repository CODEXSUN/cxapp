import { apiGet, apiPost } from "../../shared/api/platform-api";
import type {
  DatabaseActionPayload,
  DatabaseMaintenanceRun,
  MasterDatabaseStatus
} from "./master-database.types";

export function getMasterDatabaseStatus() {
  return apiGet<MasterDatabaseStatus>("/admin/database/master", "sa");
}

export function migrateMasterDatabase(payload: DatabaseActionPayload) {
  return apiPost<DatabaseMaintenanceRun>("/admin/database/master/migrate", payload, "sa");
}

export function requestMasterDatabaseBackup(payload: DatabaseActionPayload) {
  return apiPost<DatabaseMaintenanceRun>("/admin/database/master/backup", payload, "sa");
}

export function requestMasterDatabaseRestore(payload: DatabaseActionPayload) {
  return apiPost<DatabaseMaintenanceRun>("/admin/database/master/restore", payload, "sa");
}
