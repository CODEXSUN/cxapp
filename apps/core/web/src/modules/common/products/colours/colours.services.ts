import { getTenantDbName, getTenantId, getToken } from "../../../../shared/api/tenant-context";
import { requiredClientEnv } from "../../../../shared/env/client-env";
import type { ColoursListFilters, ColoursRecord, ColoursSavePayload } from "./colours.types";

const coreApiBaseUrl = requiredClientEnv("VITE_PLATFORM_API_URL");
const coloursPath = "/core/common/products/colours";
type ApiEnvelope<T> = { data: T; success: true } | { error: { message: string }; success: false };

async function coloursRequest<T>(suffix = "", options: RequestInit = {}) {
  const token = getToken("tenant");
  const tenantDbName = getTenantDbName();
  const response = await fetch(`${coreApiBaseUrl}${coloursPath}${suffix}`, {
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
    throw new Error(envelope.success ? "Colours request failed." : envelope.error.message);
  }
  return envelope.data;
}

export function listColours(filters: ColoursListFilters = {}) {
  const query = new URLSearchParams();
  if (filters.search?.trim()) query.set("search", filters.search.trim());
  return coloursRequest<ColoursRecord[]>(query.size ? `?${query.toString()}` : "");
}
export function createColours(payload: ColoursSavePayload) {
  return coloursRequest<ColoursRecord>("", { body: JSON.stringify(payload), method: "POST" });
}
export function updateColours(id: number, payload: ColoursSavePayload) {
  return coloursRequest<ColoursRecord>(`/${id}`, { body: JSON.stringify(payload), method: "PUT" });
}
export function activateColours(id: number) {
  return coloursRequest<ColoursRecord>(`/${id}/activate`, { method: "POST" });
}
export function deactivateColours(id: number) {
  return coloursRequest<ColoursRecord>(`/${id}/deactivate`, { method: "POST" });
}
export function forceDeleteColours(id: number) {
  return coloursRequest<ColoursRecord>(`/${id}/force`, { method: "DELETE" });
}
