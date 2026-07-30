import { getTenantDbName, getTenantId, getToken } from "../../../../shared/api/tenant-context";
import { requiredClientEnv } from "../../../../shared/env/client-env";
import type {
  ProductGroupsListFilters,
  ProductGroupsRecord,
  ProductGroupsSavePayload
} from "./product-groups.types";

const coreApiBaseUrl = requiredClientEnv("VITE_PLATFORM_API_URL");
const productGroupsPath = "/core/common/products/product-groups";
type ApiEnvelope<T> = { data: T; success: true } | { error: { message: string }; success: false };

async function productGroupsRequest<T>(suffix = "", options: RequestInit = {}) {
  const token = getToken("tenant");
  const tenantDbName = getTenantDbName();
  const response = await fetch(`${coreApiBaseUrl}${productGroupsPath}${suffix}`, {
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
    throw new Error(envelope.success ? "ProductGroups request failed." : envelope.error.message);
  }
  return envelope.data;
}

export function listProductGroups(filters: ProductGroupsListFilters = {}) {
  const query = new URLSearchParams();
  if (filters.search?.trim()) query.set("search", filters.search.trim());
  return productGroupsRequest<ProductGroupsRecord[]>(query.size ? `?${query.toString()}` : "");
}
export function createProductGroups(payload: ProductGroupsSavePayload) {
  return productGroupsRequest<ProductGroupsRecord>("", {
    body: JSON.stringify(payload),
    method: "POST"
  });
}
export function updateProductGroups(id: number, payload: ProductGroupsSavePayload) {
  return productGroupsRequest<ProductGroupsRecord>(`/${id}`, {
    body: JSON.stringify(payload),
    method: "PUT"
  });
}
export function activateProductGroups(id: number) {
  return productGroupsRequest<ProductGroupsRecord>(`/${id}/activate`, { method: "POST" });
}
export function deactivateProductGroups(id: number) {
  return productGroupsRequest<ProductGroupsRecord>(`/${id}/deactivate`, { method: "POST" });
}
export function forceDeleteProductGroups(id: number) {
  return productGroupsRequest<ProductGroupsRecord>(`/${id}/force`, { method: "DELETE" });
}
