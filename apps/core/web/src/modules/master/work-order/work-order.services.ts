import { getTenantDbName, getTenantId, getToken } from "../../../shared/api/tenant-context";
import { requiredClientEnv } from "../../../shared/env/client-env";
import type {
  WorkOrderLookupRecord,
  WorkOrderRecord,
  WorkOrderSavePayload
} from "./work-order.types";
const base = requiredClientEnv("VITE_PLATFORM_API_URL"),
  path = "/core/master/work-orders";
type Envelope<T> = { data: T; success: true } | { error: { message: string }; success: false };
async function request<T>(url: string, options: RequestInit = {}) {
  const token = getToken("tenant"),
    database = getTenantDbName();
  const response = await fetch(`${base}${url}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(database ? { "x-tenant-db": database } : {}),
      ...(getTenantId() ? { "x-tenant-id": getTenantId()! } : {}),
      ...options.headers
    }
  });
  const body = (await response.json()) as Envelope<T>;
  if (!response.ok || !body.success)
    throw new Error(body.success ? "Core API request failed." : body.error.message);
  return body.data;
}
export const listWorkOrders = (search = "") =>
  request<WorkOrderRecord[]>(`${path}?search=${encodeURIComponent(search)}`);
export const createWorkOrder = (payload: WorkOrderSavePayload) =>
  request<WorkOrderRecord>(path, { body: JSON.stringify(payload), method: "POST" });
export const updateWorkOrder = (id: number, payload: WorkOrderSavePayload) =>
  request<WorkOrderRecord>(`${path}/${id}`, { body: JSON.stringify(payload), method: "PUT" });
export const setWorkOrderActive = (id: number, active: boolean) =>
  request<WorkOrderRecord>(`${path}/${id}/${active ? "activate" : "deactivate"}`, {
    method: "POST"
  });
export const forceDeleteWorkOrder = (id: number) =>
  request<WorkOrderRecord>(`${path}/${id}/force`, { method: "DELETE" });
export const listWorkOrderLookup = (lookupPath: string) =>
  request<WorkOrderLookupRecord[]>(lookupPath);
