import { apiGet, apiPost } from "../../shared/api/platform-api";
import type {
  DatabaseMaintenanceRun,
  TenantDatabaseActionPayload,
  TenantDatabaseDetails,
  TenantDatabaseStatus
} from "./tenant-database.types";

export function listTenantDatabaseStatus() {
  return apiGet<TenantDatabaseStatus[]>("/admin/database/tenants", "sa");
}

export function getTenantDatabaseDetails(tenantId: number) {
  return apiGet<TenantDatabaseDetails>(`/admin/database/tenants/${tenantId}/details`, "sa");
}

export function migrateTenantDatabase(tenantId: number, payload: TenantDatabaseActionPayload) {
  return apiPost<DatabaseMaintenanceRun>(
    `/admin/database/tenants/${tenantId}/migrate`,
    payload,
    "sa"
  );
}

export function setupTenantDatabase(tenantId: number, payload: TenantDatabaseActionPayload) {
  return apiPost<DatabaseMaintenanceRun>(
    `/admin/database/tenants/${tenantId}/setup`,
    payload,
    "sa"
  );
}

export function reinstallTenantDatabase(tenantId: number, payload: TenantDatabaseActionPayload) {
  return apiPost<DatabaseMaintenanceRun>(
    `/admin/database/tenants/${tenantId}/reinstall`,
    payload,
    "sa"
  );
}

export function requestTenantDatabaseBackup(
  tenantId: number,
  payload: TenantDatabaseActionPayload
) {
  return apiPost<DatabaseMaintenanceRun>(
    `/admin/database/tenants/${tenantId}/backup`,
    payload,
    "sa"
  );
}

export function requestTenantDatabaseRestore(
  tenantId: number,
  payload: TenantDatabaseActionPayload
) {
  return apiPost<DatabaseMaintenanceRun>(
    `/admin/database/tenants/${tenantId}/restore`,
    payload,
    "sa"
  );
}
