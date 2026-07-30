import { getTenantDbName, getTenantId, getToken } from "../../../../shared/api/tenant-context";
import { requiredClientEnv } from "../../../../shared/env/client-env";
import type {
  StateOption,
  DistrictListFilters,
  DistrictRecord,
  DistrictSavePayload
} from "./district.types";
const baseUrl = requiredClientEnv("VITE_PLATFORM_API_URL");
const path = "/core/common/location/districts";
type Envelope<T> = { data: T; success: true } | { error: { message: string }; success: false };
async function request<T>(url: string, options: RequestInit = {}) {
  const token = getToken("tenant"),
    tenant = getTenantDbName();
  const response = await fetch(`${baseUrl}${url}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(tenant ? { "x-tenant-db": tenant } : {}),
      ...(getTenantId() ? { "x-tenant-id": getTenantId()! } : {}),
      ...options.headers
    }
  });
  const envelope = (await response.json()) as Envelope<T>;
  if (!response.ok || !envelope.success)
    throw new Error(envelope.success ? "District request failed." : envelope.error.message);
  return envelope.data;
}
export function listDistricts(filters: DistrictListFilters = {}) {
  const query = new URLSearchParams();
  if (filters.stateId) query.set("stateId", String(filters.stateId));
  if (filters.search?.trim()) query.set("search", filters.search.trim());
  return request<DistrictRecord[]>(`${path}${query.size ? `?${query}` : ""}`);
}
export function listDistrictStateOptions() {
  return request<StateOption[]>("/core/common/location/states");
}
export function createDistrict(payload: DistrictSavePayload) {
  return request<DistrictRecord>(path, { body: JSON.stringify(payload), method: "POST" });
}
export function updateDistrict(id: number, payload: DistrictSavePayload) {
  return request<DistrictRecord>(`${path}/${id}`, { body: JSON.stringify(payload), method: "PUT" });
}
export function activateDistrict(id: number) {
  return request<DistrictRecord>(`${path}/${id}/activate`, { method: "POST" });
}
export function deactivateDistrict(id: number) {
  return request<DistrictRecord>(`${path}/${id}/deactivate`, { method: "POST" });
}
export function forceDeleteDistrict(id: number) {
  return request<DistrictRecord>(`${path}/${id}/force`, { method: "DELETE" });
}
