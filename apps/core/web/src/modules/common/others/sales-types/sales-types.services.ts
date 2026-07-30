import { getTenantDbName, getTenantId, getToken } from "../../../../shared/api/tenant-context";
import { requiredClientEnv } from "../../../../shared/env/client-env";
import type {
  SalesTypesListFilters,
  SalesTypesRecord,
  SalesTypesSavePayload
} from "./sales-types.types";

const coreApiBaseUrl = requiredClientEnv("VITE_PLATFORM_API_URL");
const salesTypesPath = "/core/common/others/sales-types";
type ApiEnvelope<T> = { data: T; success: true } | { error: { message: string }; success: false };

async function salesTypesRequest<T>(suffix = "", options: RequestInit = {}) {
  const token = getToken("tenant");
  const tenantDbName = getTenantDbName();
  const response = await fetch(`${coreApiBaseUrl}${salesTypesPath}${suffix}`, {
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
    throw new Error(envelope.success ? "SalesTypes request failed." : envelope.error.message);
  }
  return envelope.data;
}

export function listSalesTypes(filters: SalesTypesListFilters = {}) {
  const query = new URLSearchParams();
  if (filters.search?.trim()) query.set("search", filters.search.trim());
  return salesTypesRequest<SalesTypesRecord[]>(query.size ? `?${query.toString()}` : "");
}
export function createSalesTypes(payload: SalesTypesSavePayload) {
  return salesTypesRequest<SalesTypesRecord>("", { body: JSON.stringify(payload), method: "POST" });
}
export function updateSalesTypes(id: number, payload: SalesTypesSavePayload) {
  return salesTypesRequest<SalesTypesRecord>(`/${id}`, {
    body: JSON.stringify(payload),
    method: "PUT"
  });
}
export function activateSalesTypes(id: number) {
  return salesTypesRequest<SalesTypesRecord>(`/${id}/activate`, { method: "POST" });
}
export function deactivateSalesTypes(id: number) {
  return salesTypesRequest<SalesTypesRecord>(`/${id}/deactivate`, { method: "POST" });
}
export function forceDeleteSalesTypes(id: number) {
  return salesTypesRequest<SalesTypesRecord>(`/${id}/force`, { method: "DELETE" });
}
