import { getTenantDbName, getTenantId, getToken } from "../../../../shared/api/tenant-context";
import { requiredClientEnv } from "../../../../shared/env/client-env";
import type {
  BankNamesListFilters,
  BankNamesRecord,
  BankNamesSavePayload
} from "./bank-names.types";

const coreApiBaseUrl = requiredClientEnv("VITE_PLATFORM_API_URL");
const bankNamesPath = "/core/common/contacts/bank-names";
type ApiEnvelope<T> = { data: T; success: true } | { error: { message: string }; success: false };

async function bankNamesRequest<T>(suffix = "", options: RequestInit = {}) {
  const token = getToken("tenant");
  const tenantDbName = getTenantDbName();
  const response = await fetch(`${coreApiBaseUrl}${bankNamesPath}${suffix}`, {
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
    throw new Error(envelope.success ? "BankNames request failed." : envelope.error.message);
  }
  return envelope.data;
}

export function listBankNames(filters: BankNamesListFilters = {}) {
  const query = new URLSearchParams();
  if (filters.search?.trim()) query.set("search", filters.search.trim());
  return bankNamesRequest<BankNamesRecord[]>(query.size ? `?${query.toString()}` : "");
}
export function createBankNames(payload: BankNamesSavePayload) {
  return bankNamesRequest<BankNamesRecord>("", { body: JSON.stringify(payload), method: "POST" });
}
export function updateBankNames(id: number, payload: BankNamesSavePayload) {
  return bankNamesRequest<BankNamesRecord>(`/${id}`, {
    body: JSON.stringify(payload),
    method: "PUT"
  });
}
export function activateBankNames(id: number) {
  return bankNamesRequest<BankNamesRecord>(`/${id}/activate`, { method: "POST" });
}
export function deactivateBankNames(id: number) {
  return bankNamesRequest<BankNamesRecord>(`/${id}/deactivate`, { method: "POST" });
}
export function forceDeleteBankNames(id: number) {
  return bankNamesRequest<BankNamesRecord>(`/${id}/force`, { method: "DELETE" });
}
