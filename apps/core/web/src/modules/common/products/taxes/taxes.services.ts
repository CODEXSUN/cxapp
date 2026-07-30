import { getTenantDbName, getTenantId, getToken } from "../../../../shared/api/tenant-context";
import { requiredClientEnv } from "../../../../shared/env/client-env";
import type { TaxesListFilters, TaxesRecord, TaxesSavePayload } from "./taxes.types";

const coreApiBaseUrl = requiredClientEnv("VITE_PLATFORM_API_URL");
const taxesPath = "/core/common/products/taxes";
type ApiEnvelope<T> = { data: T; success: true } | { error: { message: string }; success: false };

async function taxesRequest<T>(suffix = "", options: RequestInit = {}) {
  const token = getToken("tenant");
  const tenantDbName = getTenantDbName();
  const response = await fetch(`${coreApiBaseUrl}${taxesPath}${suffix}`, {
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
    throw new Error(envelope.success ? "Taxes request failed." : envelope.error.message);
  }
  return envelope.data;
}

export function listTaxes(filters: TaxesListFilters = {}) {
  const query = new URLSearchParams();
  if (filters.search?.trim()) query.set("search", filters.search.trim());
  return taxesRequest<TaxesRecord[]>(query.size ? `?${query.toString()}` : "");
}
export function createTaxes(payload: TaxesSavePayload) {
  return taxesRequest<TaxesRecord>("", { body: JSON.stringify(payload), method: "POST" });
}
export function updateTaxes(id: number, payload: TaxesSavePayload) {
  return taxesRequest<TaxesRecord>(`/${id}`, { body: JSON.stringify(payload), method: "PUT" });
}
export function activateTaxes(id: number) {
  return taxesRequest<TaxesRecord>(`/${id}/activate`, { method: "POST" });
}
export function deactivateTaxes(id: number) {
  return taxesRequest<TaxesRecord>(`/${id}/deactivate`, { method: "POST" });
}
export function forceDeleteTaxes(id: number) {
  return taxesRequest<TaxesRecord>(`/${id}/force`, { method: "DELETE" });
}
