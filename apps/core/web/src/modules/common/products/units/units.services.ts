import { getTenantDbName, getTenantId, getToken } from "../../../../shared/api/tenant-context";
import { requiredClientEnv } from "../../../../shared/env/client-env";
import type { UnitsListFilters, UnitsRecord, UnitsSavePayload } from "./units.types";

const coreApiBaseUrl = requiredClientEnv("VITE_PLATFORM_API_URL");
const unitsPath = "/core/common/products/units";
type ApiEnvelope<T> = { data: T; success: true } | { error: { message: string }; success: false };

async function unitsRequest<T>(suffix = "", options: RequestInit = {}) {
  const token = getToken("tenant");
  const tenantDbName = getTenantDbName();
  const response = await fetch(`${coreApiBaseUrl}${unitsPath}${suffix}`, {
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
    throw new Error(envelope.success ? "Units request failed." : envelope.error.message);
  }
  return envelope.data;
}

export function listUnits(filters: UnitsListFilters = {}) {
  const query = new URLSearchParams();
  if (filters.search?.trim()) query.set("search", filters.search.trim());
  return unitsRequest<UnitsRecord[]>(query.size ? `?${query.toString()}` : "");
}
export function createUnits(payload: UnitsSavePayload) {
  return unitsRequest<UnitsRecord>("", { body: JSON.stringify(payload), method: "POST" });
}
export function updateUnits(id: number, payload: UnitsSavePayload) {
  return unitsRequest<UnitsRecord>(`/${id}`, { body: JSON.stringify(payload), method: "PUT" });
}
export function activateUnits(id: number) {
  return unitsRequest<UnitsRecord>(`/${id}/activate`, { method: "POST" });
}
export function deactivateUnits(id: number) {
  return unitsRequest<UnitsRecord>(`/${id}/deactivate`, { method: "POST" });
}
export function forceDeleteUnits(id: number) {
  return unitsRequest<UnitsRecord>(`/${id}/force`, { method: "DELETE" });
}
