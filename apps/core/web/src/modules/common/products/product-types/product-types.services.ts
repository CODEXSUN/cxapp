import { getTenantDbName, getTenantId, getToken } from "../../../../shared/api/tenant-context";
import { requiredClientEnv } from "../../../../shared/env/client-env";
import type {
  ProductTypesListFilters,
  ProductTypesRecord,
  ProductTypesSavePayload
} from "./product-types.types";

const coreApiBaseUrl = requiredClientEnv("VITE_PLATFORM_API_URL");
const productTypesPath = "/core/common/products/product-types";
type ApiEnvelope<T> = { data: T; success: true } | { error: { message: string }; success: false };

async function productTypesRequest<T>(suffix = "", options: RequestInit = {}) {
  const token = getToken("tenant");
  const tenantDbName = getTenantDbName();
  const response = await fetch(`${coreApiBaseUrl}${productTypesPath}${suffix}`, {
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
    throw new Error(envelope.success ? "ProductTypes request failed." : envelope.error.message);
  }
  return envelope.data;
}

export function listProductTypes(filters: ProductTypesListFilters = {}) {
  const query = new URLSearchParams();
  if (filters.search?.trim()) query.set("search", filters.search.trim());
  return productTypesRequest<ProductTypesRecord[]>(query.size ? `?${query.toString()}` : "");
}
export function createProductTypes(payload: ProductTypesSavePayload) {
  return productTypesRequest<ProductTypesRecord>("", {
    body: JSON.stringify(payload),
    method: "POST"
  });
}
export function updateProductTypes(id: number, payload: ProductTypesSavePayload) {
  return productTypesRequest<ProductTypesRecord>(`/${id}`, {
    body: JSON.stringify(payload),
    method: "PUT"
  });
}
export function activateProductTypes(id: number) {
  return productTypesRequest<ProductTypesRecord>(`/${id}/activate`, { method: "POST" });
}
export function deactivateProductTypes(id: number) {
  return productTypesRequest<ProductTypesRecord>(`/${id}/deactivate`, { method: "POST" });
}
export function forceDeleteProductTypes(id: number) {
  return productTypesRequest<ProductTypesRecord>(`/${id}/force`, { method: "DELETE" });
}
