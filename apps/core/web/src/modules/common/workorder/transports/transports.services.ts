import { getTenantDbName, getTenantId, getToken } from "../../../../shared/api/tenant-context";
import { requiredClientEnv } from "../../../../shared/env/client-env";
import type {
  TransportsListFilters,
  TransportsRecord,
  TransportsSavePayload
} from "./transports.types";

const coreApiBaseUrl = requiredClientEnv("VITE_PLATFORM_API_URL");
const transportsPath = "/core/common/workorder/transports";
type ApiEnvelope<T> = { data: T; success: true } | { error: { message: string }; success: false };

async function transportsRequest<T>(suffix = "", options: RequestInit = {}) {
  const token = getToken("tenant");
  const tenantDbName = getTenantDbName();
  const response = await fetch(`${coreApiBaseUrl}${transportsPath}${suffix}`, {
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
    throw new Error(envelope.success ? "Transports request failed." : envelope.error.message);
  }
  return envelope.data;
}

export function listTransports(filters: TransportsListFilters = {}) {
  const query = new URLSearchParams();
  if (filters.search?.trim()) query.set("search", filters.search.trim());
  return transportsRequest<TransportsRecord[]>(query.size ? `?${query.toString()}` : "");
}
export function createTransports(payload: TransportsSavePayload) {
  return transportsRequest<TransportsRecord>("", { body: JSON.stringify(payload), method: "POST" });
}
export function updateTransports(id: number, payload: TransportsSavePayload) {
  return transportsRequest<TransportsRecord>(`/${id}`, {
    body: JSON.stringify(payload),
    method: "PUT"
  });
}
export function activateTransports(id: number) {
  return transportsRequest<TransportsRecord>(`/${id}/activate`, { method: "POST" });
}
export function deactivateTransports(id: number) {
  return transportsRequest<TransportsRecord>(`/${id}/deactivate`, { method: "POST" });
}
export function forceDeleteTransports(id: number) {
  return transportsRequest<TransportsRecord>(`/${id}/force`, { method: "DELETE" });
}
