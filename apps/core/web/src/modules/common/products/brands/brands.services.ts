import { getTenantDbName, getTenantId, getToken } from "../../../../shared/api/tenant-context";
import { requiredClientEnv } from "../../../../shared/env/client-env";
import type { BrandsListFilters, BrandsRecord, BrandsSavePayload } from "./brands.types";

const coreApiBaseUrl = requiredClientEnv("VITE_PLATFORM_API_URL");
const brandsPath = "/core/common/products/brands";
type ApiEnvelope<T> = { data: T; success: true } | { error: { message: string }; success: false };

async function brandsRequest<T>(suffix = "", options: RequestInit = {}) {
  const token = getToken("tenant");
  const tenantDbName = getTenantDbName();
  const response = await fetch(`${coreApiBaseUrl}${brandsPath}${suffix}`, {
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
    throw new Error(envelope.success ? "Brands request failed." : envelope.error.message);
  }
  return envelope.data;
}

export function listBrands(filters: BrandsListFilters = {}) {
  const query = new URLSearchParams();
  if (filters.search?.trim()) query.set("search", filters.search.trim());
  return brandsRequest<BrandsRecord[]>(query.size ? `?${query.toString()}` : "");
}
export function createBrands(payload: BrandsSavePayload) {
  return brandsRequest<BrandsRecord>("", { body: JSON.stringify(payload), method: "POST" });
}
export function updateBrands(id: number, payload: BrandsSavePayload) {
  return brandsRequest<BrandsRecord>(`/${id}`, { body: JSON.stringify(payload), method: "PUT" });
}
export function activateBrands(id: number) {
  return brandsRequest<BrandsRecord>(`/${id}/activate`, { method: "POST" });
}
export function deactivateBrands(id: number) {
  return brandsRequest<BrandsRecord>(`/${id}/deactivate`, { method: "POST" });
}
export function forceDeleteBrands(id: number) {
  return brandsRequest<BrandsRecord>(`/${id}/force`, { method: "DELETE" });
}
