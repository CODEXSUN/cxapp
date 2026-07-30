import { getTenantDbName, getTenantId, getToken } from "../../../../shared/api/tenant-context";
import { requiredClientEnv } from "../../../../shared/env/client-env";
import type {
  LedgerGroupLookup,
  LedgerListFilters,
  LedgerRecord,
  LedgerSavePayload
} from "./ledgers.types";
const base = requiredClientEnv("VITE_PLATFORM_API_URL");
const path = "/core/common/accounts/ledgers";
type Envelope<T> = { data: T; success: true } | { error: { message: string }; success: false };
async function request<T>(url: string, options: RequestInit = {}) {
  const token = getToken("tenant");
  const database = getTenantDbName();
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
    throw new Error(body.success ? "Ledger request failed." : body.error.message);
  return body.data;
}
export function listLedgers(filters: LedgerListFilters = {}) {
  const query = new URLSearchParams();
  if (filters.search?.trim()) query.set("search", filters.search.trim());
  return request<LedgerRecord[]>(`${path}${query.size ? `?${query}` : ""}`);
}
export const listLedgerGroupLookups = () =>
  request<LedgerGroupLookup[]>("/core/common/accounts/ledger-groups");
export const createLedger = (payload: LedgerSavePayload) =>
  request<LedgerRecord>(path, { method: "POST", body: JSON.stringify(payload) });
export const updateLedger = (id: number, payload: LedgerSavePayload) =>
  request<LedgerRecord>(`${path}/${id}`, { method: "PUT", body: JSON.stringify(payload) });
export const activateLedger = (id: number) =>
  request<LedgerRecord>(`${path}/${id}/activate`, { method: "POST" });
export const deactivateLedger = (id: number) =>
  request<LedgerRecord>(`${path}/${id}/deactivate`, { method: "POST" });
export const forceDeleteLedger = (id: number) =>
  request<LedgerRecord>(`${path}/${id}/force`, { method: "DELETE" });
