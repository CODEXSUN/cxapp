import { getTenantDbName, getTenantId, getToken } from "../../../../shared/api/tenant-context";
import { requiredClientEnv } from "../../../../shared/env/client-env";
import type {
  WorkOrderTypesListFilters,
  WorkOrderTypesRecord,
  WorkOrderTypesSavePayload
} from "./work-order-types.types";

const coreApiBaseUrl = requiredClientEnv("VITE_PLATFORM_API_URL");
const workOrderTypesPath = "/core/common/workorder/work-order-types";
type ApiEnvelope<T> = { data: T; success: true } | { error: { message: string }; success: false };

async function workOrderTypesRequest<T>(suffix = "", options: RequestInit = {}) {
  const token = getToken("tenant");
  const tenantDbName = getTenantDbName();
  const response = await fetch(`${coreApiBaseUrl}${workOrderTypesPath}${suffix}`, {
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
    throw new Error(envelope.success ? "WorkOrderTypes request failed." : envelope.error.message);
  }
  return envelope.data;
}

export function listWorkOrderTypes(filters: WorkOrderTypesListFilters = {}) {
  const query = new URLSearchParams();
  if (filters.search?.trim()) query.set("search", filters.search.trim());
  return workOrderTypesRequest<WorkOrderTypesRecord[]>(query.size ? `?${query.toString()}` : "");
}
export function createWorkOrderTypes(payload: WorkOrderTypesSavePayload) {
  return workOrderTypesRequest<WorkOrderTypesRecord>("", {
    body: JSON.stringify(payload),
    method: "POST"
  });
}
export function updateWorkOrderTypes(id: number, payload: WorkOrderTypesSavePayload) {
  return workOrderTypesRequest<WorkOrderTypesRecord>(`/${id}`, {
    body: JSON.stringify(payload),
    method: "PUT"
  });
}
export function activateWorkOrderTypes(id: number) {
  return workOrderTypesRequest<WorkOrderTypesRecord>(`/${id}/activate`, { method: "POST" });
}
export function deactivateWorkOrderTypes(id: number) {
  return workOrderTypesRequest<WorkOrderTypesRecord>(`/${id}/deactivate`, { method: "POST" });
}
export function forceDeleteWorkOrderTypes(id: number) {
  return workOrderTypesRequest<WorkOrderTypesRecord>(`/${id}/force`, { method: "DELETE" });
}
