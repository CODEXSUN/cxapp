import { getTenantDbName, getTenantId, getToken } from "../../../../shared/api/tenant-context";
import { requiredClientEnv } from "../../../../shared/env/client-env";
import type {
  WarehousesListFilters,
  WarehousesRecord,
  WarehousesSavePayload
} from "./warehouses.types";

const coreApiBaseUrl = requiredClientEnv("VITE_PLATFORM_API_URL");
const warehousesPath = "/core/common/workorder/warehouses";
type ApiEnvelope<T> = { data: T; success: true } | { error: { message: string }; success: false };

async function warehousesRequest<T>(suffix = "", options: RequestInit = {}) {
  const token = getToken("tenant");
  const tenantDbName = getTenantDbName();
  const response = await fetch(`${coreApiBaseUrl}${warehousesPath}${suffix}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(tenantDbName ? { "x-tenant-db": tenantDbName } : {}),
      ...(getTenantId() ? { "x-tenant-id": getTenantId()! } : {}),
      ...options.headers
    }
  });
  const envelope = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || !envelope.success) {
    throw new Error(envelope.success ? "Warehouses request failed." : envelope.error.message);
  }
  return envelope.data;
}

export function listWarehouses(filters: WarehousesListFilters = {}) {
  const query = new URLSearchParams();
  if (filters.search?.trim()) query.set("search", filters.search.trim());
  return warehousesRequest<WarehousesRecord[]>(query.size ? `?${query.toString()}` : "");
}
export function createWarehouses(payload: WarehousesSavePayload) {
  return warehousesRequest<WarehousesRecord>("", { body: JSON.stringify(payload), method: "POST" });
}
export function updateWarehouses(id: number, payload: WarehousesSavePayload) {
  return warehousesRequest<WarehousesRecord>(`/${id}`, {
    body: JSON.stringify(payload),
    method: "PUT"
  });
}
export function activateWarehouses(id: number) {
  return warehousesRequest<WarehousesRecord>(`/${id}/activate`, { method: "POST" });
}
export function deactivateWarehouses(id: number) {
  return warehousesRequest<WarehousesRecord>(`/${id}/deactivate`, { method: "POST" });
}
export function forceDeleteWarehouses(id: number) {
  return warehousesRequest<WarehousesRecord>(`/${id}/force`, { method: "DELETE" });
}
