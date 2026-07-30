import { getTenantDbName, getTenantId, getToken } from "../../../../shared/api/tenant-context";
import { requiredClientEnv } from "../../../../shared/env/client-env";
import type {
  ProductCategoriesListFilters,
  ProductCategoriesRecord,
  ProductCategoriesSavePayload
} from "./product-categories.types";

const coreApiBaseUrl = requiredClientEnv("VITE_PLATFORM_API_URL");
const productCategoriesPath = "/core/common/products/product-categories";
type ApiEnvelope<T> = { data: T; success: true } | { error: { message: string }; success: false };

async function productCategoriesRequest<T>(suffix = "", options: RequestInit = {}) {
  const token = getToken("tenant");
  const tenantDbName = getTenantDbName();
  const response = await fetch(`${coreApiBaseUrl}${productCategoriesPath}${suffix}`, {
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
    throw new Error(
      envelope.success ? "ProductCategories request failed." : envelope.error.message
    );
  }
  return envelope.data;
}

export function listProductCategories(filters: ProductCategoriesListFilters = {}) {
  const query = new URLSearchParams();
  if (filters.search?.trim()) query.set("search", filters.search.trim());
  return productCategoriesRequest<ProductCategoriesRecord[]>(
    query.size ? `?${query.toString()}` : ""
  );
}
export function createProductCategories(payload: ProductCategoriesSavePayload) {
  return productCategoriesRequest<ProductCategoriesRecord>("", {
    body: JSON.stringify(payload),
    method: "POST"
  });
}
export function updateProductCategories(id: number, payload: ProductCategoriesSavePayload) {
  return productCategoriesRequest<ProductCategoriesRecord>(`/${id}`, {
    body: JSON.stringify(payload),
    method: "PUT"
  });
}
export function activateProductCategories(id: number) {
  return productCategoriesRequest<ProductCategoriesRecord>(`/${id}/activate`, { method: "POST" });
}
export function deactivateProductCategories(id: number) {
  return productCategoriesRequest<ProductCategoriesRecord>(`/${id}/deactivate`, { method: "POST" });
}
export function forceDeleteProductCategories(id: number) {
  return productCategoriesRequest<ProductCategoriesRecord>(`/${id}/force`, { method: "DELETE" });
}
