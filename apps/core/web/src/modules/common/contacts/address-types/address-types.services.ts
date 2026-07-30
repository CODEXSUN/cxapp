import { getTenantDbName, getTenantId, getToken } from "../../../../shared/api/tenant-context";
import { requiredClientEnv } from "../../../../shared/env/client-env";
import type {
  AddressTypesListFilters,
  AddressTypesRecord,
  AddressTypesSavePayload
} from "./address-types.types";

const coreApiBaseUrl = requiredClientEnv("VITE_PLATFORM_API_URL");
const addressTypesPath = "/core/common/contacts/address-types";
type ApiEnvelope<T> = { data: T; success: true } | { error: { message: string }; success: false };

async function addressTypesRequest<T>(suffix = "", options: RequestInit = {}) {
  const token = getToken("tenant");
  const tenantDbName = getTenantDbName();
  const response = await fetch(`${coreApiBaseUrl}${addressTypesPath}${suffix}`, {
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
    throw new Error(envelope.success ? "AddressTypes request failed." : envelope.error.message);
  }
  return envelope.data;
}

export function listAddressTypes(filters: AddressTypesListFilters = {}) {
  const query = new URLSearchParams();
  if (filters.search?.trim()) query.set("search", filters.search.trim());
  return addressTypesRequest<AddressTypesRecord[]>(query.size ? `?${query.toString()}` : "");
}
export function createAddressTypes(payload: AddressTypesSavePayload) {
  return addressTypesRequest<AddressTypesRecord>("", {
    body: JSON.stringify(payload),
    method: "POST"
  });
}
export function updateAddressTypes(id: number, payload: AddressTypesSavePayload) {
  return addressTypesRequest<AddressTypesRecord>(`/${id}`, {
    body: JSON.stringify(payload),
    method: "PUT"
  });
}
export function activateAddressTypes(id: number) {
  return addressTypesRequest<AddressTypesRecord>(`/${id}/activate`, { method: "POST" });
}
export function deactivateAddressTypes(id: number) {
  return addressTypesRequest<AddressTypesRecord>(`/${id}/deactivate`, { method: "POST" });
}
export function forceDeleteAddressTypes(id: number) {
  return addressTypesRequest<AddressTypesRecord>(`/${id}/force`, { method: "DELETE" });
}
