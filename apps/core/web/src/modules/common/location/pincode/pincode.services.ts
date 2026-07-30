import { getTenantDbName, getTenantId, getToken } from "../../../../shared/api/tenant-context";
import { requiredClientEnv } from "../../../../shared/env/client-env";
import type {
  CityOption,
  PincodeListFilters,
  PincodeRecord,
  PincodeSavePayload
} from "./pincode.types";
const baseUrl = requiredClientEnv("VITE_PLATFORM_API_URL");
const path = "/core/common/location/pincodes";
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
    throw new Error(envelope.success ? "Pincode request failed." : envelope.error.message);
  return envelope.data;
}
export function listPincodes(filters: PincodeListFilters = {}) {
  const query = new URLSearchParams();
  if (filters.cityId) query.set("cityId", String(filters.cityId));
  if (filters.search?.trim()) query.set("search", filters.search.trim());
  return request<PincodeRecord[]>(`${path}/relations${query.size ? `?${query}` : ""}`);
}
export function listPincodeCityOptions() {
  return request<CityOption[]>("/core/common/location/cities");
}
export function createPincode(payload: PincodeSavePayload) {
  return request<PincodeRecord>(path, { body: JSON.stringify(payload), method: "POST" });
}
export function updatePincode(id: number, payload: PincodeSavePayload) {
  return request<PincodeRecord>(`${path}/${id}`, { body: JSON.stringify(payload), method: "PUT" });
}
export function activatePincode(id: number) {
  return request<PincodeRecord>(`${path}/${id}/activate`, { method: "POST" });
}
export function deactivatePincode(id: number) {
  return request<PincodeRecord>(`${path}/${id}/deactivate`, { method: "POST" });
}
export function forceDeletePincode(id: number) {
  return request<PincodeRecord>(`${path}/${id}/force`, { method: "DELETE" });
}
