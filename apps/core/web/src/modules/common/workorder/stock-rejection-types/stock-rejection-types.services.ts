import { getTenantDbName, getTenantId, getToken } from "../../../../shared/api/tenant-context";
import { requiredClientEnv } from "../../../../shared/env/client-env";
import type {
  StockRejectionTypesListFilters,
  StockRejectionTypesRecord,
  StockRejectionTypesSavePayload
} from "./stock-rejection-types.types";

const coreApiBaseUrl = requiredClientEnv("VITE_PLATFORM_API_URL");
const stockRejectionTypesPath = "/core/common/workorder/stock-rejection-types";
type ApiEnvelope<T> = { data: T; success: true } | { error: { message: string }; success: false };

async function stockRejectionTypesRequest<T>(suffix = "", options: RequestInit = {}) {
  const token = getToken("tenant");
  const tenantDbName = getTenantDbName();
  const response = await fetch(`${coreApiBaseUrl}${stockRejectionTypesPath}${suffix}`, {
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
      envelope.success ? "StockRejectionTypes request failed." : envelope.error.message
    );
  }
  return envelope.data;
}

export function listStockRejectionTypes(filters: StockRejectionTypesListFilters = {}) {
  const query = new URLSearchParams();
  if (filters.search?.trim()) query.set("search", filters.search.trim());
  return stockRejectionTypesRequest<StockRejectionTypesRecord[]>(
    query.size ? `?${query.toString()}` : ""
  );
}
export function createStockRejectionTypes(payload: StockRejectionTypesSavePayload) {
  return stockRejectionTypesRequest<StockRejectionTypesRecord>("", {
    body: JSON.stringify(payload),
    method: "POST"
  });
}
export function updateStockRejectionTypes(id: number, payload: StockRejectionTypesSavePayload) {
  return stockRejectionTypesRequest<StockRejectionTypesRecord>(`/${id}`, {
    body: JSON.stringify(payload),
    method: "PUT"
  });
}
export function activateStockRejectionTypes(id: number) {
  return stockRejectionTypesRequest<StockRejectionTypesRecord>(`/${id}/activate`, {
    method: "POST"
  });
}
export function deactivateStockRejectionTypes(id: number) {
  return stockRejectionTypesRequest<StockRejectionTypesRecord>(`/${id}/deactivate`, {
    method: "POST"
  });
}
export function forceDeleteStockRejectionTypes(id: number) {
  return stockRejectionTypesRequest<StockRejectionTypesRecord>(`/${id}/force`, {
    method: "DELETE"
  });
}
