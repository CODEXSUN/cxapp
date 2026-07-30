import { getTenantDbName, getTenantId, getToken } from "../../../../shared/api/tenant-context";
import { requiredClientEnv } from "../../../../shared/env/client-env";
import type {
  PrioritiesListFilters,
  PrioritiesRecord,
  PrioritiesSavePayload
} from "./priorities.types";

const coreApiBaseUrl = requiredClientEnv("VITE_PLATFORM_API_URL");
const prioritiesPath = "/core/common/others/priorities";
type ApiEnvelope<T> = { data: T; success: true } | { error: { message: string }; success: false };

async function prioritiesRequest<T>(suffix = "", options: RequestInit = {}) {
  const token = getToken("tenant");
  const tenantDbName = getTenantDbName();
  const response = await fetch(`${coreApiBaseUrl}${prioritiesPath}${suffix}`, {
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
    throw new Error(envelope.success ? "Priorities request failed." : envelope.error.message);
  }
  return envelope.data;
}

export function listPriorities(filters: PrioritiesListFilters = {}) {
  const query = new URLSearchParams();
  if (filters.search?.trim()) query.set("search", filters.search.trim());
  return prioritiesRequest<PrioritiesRecord[]>(query.size ? `?${query.toString()}` : "");
}
export function createPriorities(payload: PrioritiesSavePayload) {
  return prioritiesRequest<PrioritiesRecord>("", { body: JSON.stringify(payload), method: "POST" });
}
export function updatePriorities(id: number, payload: PrioritiesSavePayload) {
  return prioritiesRequest<PrioritiesRecord>(`/${id}`, {
    body: JSON.stringify(payload),
    method: "PUT"
  });
}
export function activatePriorities(id: number) {
  return prioritiesRequest<PrioritiesRecord>(`/${id}/activate`, { method: "POST" });
}
export function deactivatePriorities(id: number) {
  return prioritiesRequest<PrioritiesRecord>(`/${id}/deactivate`, { method: "POST" });
}
export function forceDeletePriorities(id: number) {
  return prioritiesRequest<PrioritiesRecord>(`/${id}/force`, { method: "DELETE" });
}
