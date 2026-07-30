import { getTenantDbName, getTenantId, getToken } from "../../../../shared/api/tenant-context";
import { requiredClientEnv } from "../../../../shared/env/client-env";
import type { DistrictOption, CityListFilters, CityRecord, CitySavePayload } from "./city.types";
const baseUrl = requiredClientEnv("VITE_PLATFORM_API_URL");
const path = "/core/common/location/cities";
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
    throw new Error(envelope.success ? "City request failed." : envelope.error.message);
  return envelope.data;
}
export function listCitys(filters: CityListFilters = {}) {
  const query = new URLSearchParams();
  if (filters.districtId) query.set("districtId", String(filters.districtId));
  if (filters.search?.trim()) query.set("search", filters.search.trim());
  return request<CityRecord[]>(`${path}${query.size ? `?${query}` : ""}`);
}
export function listCityDistrictOptions() {
  return request<DistrictOption[]>("/core/common/location/districts");
}
export function createCity(payload: CitySavePayload) {
  return request<CityRecord>(path, { body: JSON.stringify(payload), method: "POST" });
}
export function updateCity(id: number, payload: CitySavePayload) {
  return request<CityRecord>(`${path}/${id}`, { body: JSON.stringify(payload), method: "PUT" });
}
export function activateCity(id: number) {
  return request<CityRecord>(`${path}/${id}/activate`, { method: "POST" });
}
export function deactivateCity(id: number) {
  return request<CityRecord>(`${path}/${id}/deactivate`, { method: "POST" });
}
export function forceDeleteCity(id: number) {
  return request<CityRecord>(`${path}/${id}/force`, { method: "DELETE" });
}
