import { getTenantDbName, getTenantId, getToken } from "../../../../shared/api/tenant-context";
import { requiredClientEnv } from "../../../../shared/env/client-env";
import type { CountryListFilters, CountryRecord, CountrySavePayload } from "./country.types";

const coreApiBaseUrl = requiredClientEnv("VITE_PLATFORM_API_URL");
const countryPath = "/core/common/location/countries";

type ApiEnvelope<T> = { data: T; success: true } | { error: { message: string }; success: false };

async function countryRequest<T>(path = "", options: RequestInit = {}) {
  const token = getToken("tenant");
  const tenantDbName = getTenantDbName();
  const response = await fetch(`${coreApiBaseUrl}${countryPath}${path}`, {
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
    throw new Error(envelope.success ? "Country request failed." : envelope.error.message);
  }
  return envelope.data;
}

export function listCountries(filters: CountryListFilters = {}) {
  const query = new URLSearchParams();
  if (filters.search?.trim()) query.set("search", filters.search.trim());
  const suffix = query.size ? `?${query.toString()}` : "";
  return countryRequest<CountryRecord[]>(suffix);
}

export function createCountry(payload: CountrySavePayload) {
  return countryRequest<CountryRecord>("", { body: JSON.stringify(payload), method: "POST" });
}

export function updateCountry(id: number, payload: CountrySavePayload) {
  return countryRequest<CountryRecord>(`/${id}`, {
    body: JSON.stringify(payload),
    method: "PUT"
  });
}

export function activateCountry(id: number) {
  return countryRequest<CountryRecord>(`/${id}/activate`, { method: "POST" });
}

export function deactivateCountry(id: number) {
  return countryRequest<CountryRecord>(`/${id}/deactivate`, { method: "POST" });
}

export function forceDeleteCountry(id: number) {
  return countryRequest<CountryRecord>(`/${id}/force`, { method: "DELETE" });
}
