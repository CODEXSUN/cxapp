import { getTenantDbName, getTenantId, getToken } from "../../../../shared/api/tenant-context";
import { requiredClientEnv } from "../../../../shared/env/client-env";
import type {
  CurrenciesListFilters,
  CurrenciesRecord,
  CurrenciesSavePayload
} from "./currencies.types";

const coreApiBaseUrl = requiredClientEnv("VITE_PLATFORM_API_URL");
const currenciesPath = "/core/common/others/currencies";
type ApiEnvelope<T> = { data: T; success: true } | { error: { message: string }; success: false };

async function currenciesRequest<T>(suffix = "", options: RequestInit = {}) {
  const token = getToken("tenant");
  const tenantDbName = getTenantDbName();
  const response = await fetch(`${coreApiBaseUrl}${currenciesPath}${suffix}`, {
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
    throw new Error(envelope.success ? "Currencies request failed." : envelope.error.message);
  }
  return envelope.data;
}

export function listCurrencies(filters: CurrenciesListFilters = {}) {
  const query = new URLSearchParams();
  if (filters.search?.trim()) query.set("search", filters.search.trim());
  return currenciesRequest<CurrenciesRecord[]>(query.size ? `?${query.toString()}` : "");
}
export function createCurrencies(payload: CurrenciesSavePayload) {
  return currenciesRequest<CurrenciesRecord>("", { body: JSON.stringify(payload), method: "POST" });
}
export function updateCurrencies(id: number, payload: CurrenciesSavePayload) {
  return currenciesRequest<CurrenciesRecord>(`/${id}`, {
    body: JSON.stringify(payload),
    method: "PUT"
  });
}
export function activateCurrencies(id: number) {
  return currenciesRequest<CurrenciesRecord>(`/${id}/activate`, { method: "POST" });
}
export function deactivateCurrencies(id: number) {
  return currenciesRequest<CurrenciesRecord>(`/${id}/deactivate`, { method: "POST" });
}
export function forceDeleteCurrencies(id: number) {
  return currenciesRequest<CurrenciesRecord>(`/${id}/force`, { method: "DELETE" });
}
