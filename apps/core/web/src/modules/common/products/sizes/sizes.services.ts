import { getTenantDbName, getTenantId, getToken } from "../../../../shared/api/tenant-context";
import { requiredClientEnv } from "../../../../shared/env/client-env";
import type { SizesListFilters, SizesRecord, SizesSavePayload } from "./sizes.types";

const coreApiBaseUrl = requiredClientEnv("VITE_PLATFORM_API_URL");
const sizesPath = "/core/common/products/sizes";
type ApiEnvelope<T> = { data: T; success: true } | { error: { message: string }; success: false };

async function sizesRequest<T>(suffix = "", options: RequestInit = {}) {
  const token = getToken("tenant");
  const tenantDbName = getTenantDbName();
  const response = await fetch(`${coreApiBaseUrl}${sizesPath}${suffix}`, {
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
    throw new Error(envelope.success ? "Sizes request failed." : envelope.error.message);
  }
  return envelope.data;
}

export function listSizes(filters: SizesListFilters = {}) {
  const query = new URLSearchParams();
  if (filters.search?.trim()) query.set("search", filters.search.trim());
  return sizesRequest<SizesRecord[]>(query.size ? `?${query.toString()}` : "");
}
export function createSizes(payload: SizesSavePayload) {
  return sizesRequest<SizesRecord>("", { body: JSON.stringify(payload), method: "POST" });
}
export function updateSizes(id: number, payload: SizesSavePayload) {
  return sizesRequest<SizesRecord>(`/${id}`, { body: JSON.stringify(payload), method: "PUT" });
}
export function activateSizes(id: number) {
  return sizesRequest<SizesRecord>(`/${id}/activate`, { method: "POST" });
}
export function deactivateSizes(id: number) {
  return sizesRequest<SizesRecord>(`/${id}/deactivate`, { method: "POST" });
}
export function forceDeleteSizes(id: number) {
  return sizesRequest<SizesRecord>(`/${id}/force`, { method: "DELETE" });
}
