import { getTenantDbName, getTenantId, getToken } from "../../../../shared/api/tenant-context";
import { requiredClientEnv } from "../../../../shared/env/client-env";
import type { MonthsListFilters, MonthsRecord, MonthsSavePayload } from "./months.types";

const coreApiBaseUrl = requiredClientEnv("VITE_PLATFORM_API_URL");
const monthsPath = "/core/common/others/months";
type ApiEnvelope<T> = { data: T; success: true } | { error: { message: string }; success: false };

async function monthsRequest<T>(suffix = "", options: RequestInit = {}) {
  const token = getToken("tenant");
  const tenantDbName = getTenantDbName();
  const response = await fetch(`${coreApiBaseUrl}${monthsPath}${suffix}`, {
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
    throw new Error(envelope.success ? "Months request failed." : envelope.error.message);
  }
  return envelope.data;
}

export function listMonths(filters: MonthsListFilters = {}) {
  const query = new URLSearchParams();
  if (filters.search?.trim()) query.set("search", filters.search.trim());
  return monthsRequest<MonthsRecord[]>(query.size ? `?${query.toString()}` : "");
}
export function createMonths(payload: MonthsSavePayload) {
  return monthsRequest<MonthsRecord>("", { body: JSON.stringify(payload), method: "POST" });
}
export function updateMonths(id: number, payload: MonthsSavePayload) {
  return monthsRequest<MonthsRecord>(`/${id}`, { body: JSON.stringify(payload), method: "PUT" });
}
export function activateMonths(id: number) {
  return monthsRequest<MonthsRecord>(`/${id}/activate`, { method: "POST" });
}
export function deactivateMonths(id: number) {
  return monthsRequest<MonthsRecord>(`/${id}/deactivate`, { method: "POST" });
}
export function forceDeleteMonths(id: number) {
  return monthsRequest<MonthsRecord>(`/${id}/force`, { method: "DELETE" });
}
