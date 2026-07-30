import { getTenantDbName, getTenantId, getToken } from "../../../../shared/api/tenant-context";
import { requiredClientEnv } from "../../../../shared/env/client-env";
import type { StylesListFilters, StylesRecord, StylesSavePayload } from "./styles.types";

const coreApiBaseUrl = requiredClientEnv("VITE_PLATFORM_API_URL");
const stylesPath = "/core/common/products/styles";
type ApiEnvelope<T> = { data: T; success: true } | { error: { message: string }; success: false };

async function stylesRequest<T>(suffix = "", options: RequestInit = {}) {
  const token = getToken("tenant");
  const tenantDbName = getTenantDbName();
  const response = await fetch(`${coreApiBaseUrl}${stylesPath}${suffix}`, {
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
    throw new Error(envelope.success ? "Styles request failed." : envelope.error.message);
  }
  return envelope.data;
}

export function listStyles(filters: StylesListFilters = {}) {
  const query = new URLSearchParams();
  if (filters.search?.trim()) query.set("search", filters.search.trim());
  return stylesRequest<StylesRecord[]>(query.size ? `?${query.toString()}` : "");
}
export function createStyles(payload: StylesSavePayload) {
  return stylesRequest<StylesRecord>("", { body: JSON.stringify(payload), method: "POST" });
}
export function updateStyles(id: number, payload: StylesSavePayload) {
  return stylesRequest<StylesRecord>(`/${id}`, { body: JSON.stringify(payload), method: "PUT" });
}
export function activateStyles(id: number) {
  return stylesRequest<StylesRecord>(`/${id}/activate`, { method: "POST" });
}
export function deactivateStyles(id: number) {
  return stylesRequest<StylesRecord>(`/${id}/deactivate`, { method: "POST" });
}
export function forceDeleteStyles(id: number) {
  return stylesRequest<StylesRecord>(`/${id}/force`, { method: "DELETE" });
}
