import { getTenantDbName, getTenantId, getToken } from "../../../../shared/api/tenant-context";
import { requiredClientEnv } from "../../../../shared/env/client-env";
import type { CountryOption, StateListFilters, StateRecord, StateSavePayload } from "./state.types";

const coreApiBaseUrl = requiredClientEnv("VITE_PLATFORM_API_URL");
const statePath = "/core/common/location/states";

type ApiEnvelope<T> = { data: T; success: true } | { error: { message: string }; success: false };

async function coreRequest<T>(path: string, options: RequestInit = {}) {
  const token = getToken("tenant");
  const tenantDbName = getTenantDbName();
  const response = await fetch(`${coreApiBaseUrl}${path}`, {
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
    throw new Error(envelope.success ? "State request failed." : envelope.error.message);
  }
  return envelope.data;
}

export function listStates(filters: StateListFilters = {}) {
  const query = new URLSearchParams();
  if (filters.countryId) query.set("countryId", String(filters.countryId));
  if (filters.search?.trim()) query.set("search", filters.search.trim());
  return coreRequest<StateRecord[]>(`${statePath}${query.size ? `?${query}` : ""}`);
}

export function listStateCountryOptions() {
  return coreRequest<CountryOption[]>("/core/common/location/countries");
}

export function createState(payload: StateSavePayload) {
  return coreRequest<StateRecord>(statePath, { body: JSON.stringify(payload), method: "POST" });
}

export function updateState(id: number, payload: StateSavePayload) {
  return coreRequest<StateRecord>(`${statePath}/${id}`, {
    body: JSON.stringify(payload),
    method: "PUT"
  });
}

export function activateState(id: number) {
  return coreRequest<StateRecord>(`${statePath}/${id}/activate`, { method: "POST" });
}

export function deactivateState(id: number) {
  return coreRequest<StateRecord>(`${statePath}/${id}/deactivate`, { method: "POST" });
}

export function forceDeleteState(id: number) {
  return coreRequest<StateRecord>(`${statePath}/${id}/force`, { method: "DELETE" });
}
