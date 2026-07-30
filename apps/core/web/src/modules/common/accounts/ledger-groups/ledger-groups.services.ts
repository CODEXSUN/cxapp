import { getTenantDbName, getTenantId, getToken } from "../../../../shared/api/tenant-context";
import { requiredClientEnv } from "../../../../shared/env/client-env";
import type {
  LedgerGroupListFilters,
  LedgerGroupRecord,
  LedgerGroupSavePayload
} from "./ledger-groups.types";
const base = requiredClientEnv("VITE_PLATFORM_API_URL");
const path = "/core/common/accounts/ledger-groups";
type Envelope<T> = { data: T; success: true } | { error: { message: string }; success: false };
async function request<T>(suffix = "", options: RequestInit = {}) {
  const token = getToken("tenant");
  const database = getTenantDbName();
  const response = await fetch(`${base}${path}${suffix}`, {
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
    throw new Error(body.success ? "Ledger group request failed." : body.error.message);
  return body.data;
}
export function listLedgerGroups(filters: LedgerGroupListFilters = {}) {
  const query = new URLSearchParams();
  if (filters.search?.trim()) query.set("search", filters.search.trim());
  return request<LedgerGroupRecord[]>(query.size ? `?${query}` : "");
}
export const createLedgerGroup = (payload: LedgerGroupSavePayload) =>
  request<LedgerGroupRecord>("", { method: "POST", body: JSON.stringify(payload) });
export const updateLedgerGroup = (id: number, payload: LedgerGroupSavePayload) =>
  request<LedgerGroupRecord>(`/${id}`, { method: "PUT", body: JSON.stringify(payload) });
export const activateLedgerGroup = (id: number) =>
  request<LedgerGroupRecord>(`/${id}/activate`, { method: "POST" });
export const deactivateLedgerGroup = (id: number) =>
  request<LedgerGroupRecord>(`/${id}/deactivate`, { method: "POST" });
export const forceDeleteLedgerGroup = (id: number) =>
  request<LedgerGroupRecord>(`/${id}/force`, { method: "DELETE" });
