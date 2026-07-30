import { getTenantDbName, getTenantId, getToken } from "../../../../shared/api/tenant-context";
import { requiredClientEnv } from "../../../../shared/env/client-env";
import type {
  ContactTypesListFilters,
  ContactTypesRecord,
  ContactTypesSavePayload
} from "./contact-types.types";

const coreApiBaseUrl = requiredClientEnv("VITE_PLATFORM_API_URL");
const contactTypesPath = "/core/common/contacts/contact-types";
type ApiEnvelope<T> = { data: T; success: true } | { error: { message: string }; success: false };

async function contactTypesRequest<T>(suffix = "", options: RequestInit = {}) {
  const token = getToken("tenant");
  const tenantDbName = getTenantDbName();
  const response = await fetch(`${coreApiBaseUrl}${contactTypesPath}${suffix}`, {
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
    throw new Error(envelope.success ? "ContactTypes request failed." : envelope.error.message);
  }
  return envelope.data;
}

export function listContactTypes(filters: ContactTypesListFilters = {}) {
  const query = new URLSearchParams();
  if (filters.search?.trim()) query.set("search", filters.search.trim());
  return contactTypesRequest<ContactTypesRecord[]>(query.size ? `?${query.toString()}` : "");
}
export function createContactTypes(payload: ContactTypesSavePayload) {
  return contactTypesRequest<ContactTypesRecord>("", {
    body: JSON.stringify(payload),
    method: "POST"
  });
}
export function updateContactTypes(id: number, payload: ContactTypesSavePayload) {
  return contactTypesRequest<ContactTypesRecord>(`/${id}`, {
    body: JSON.stringify(payload),
    method: "PUT"
  });
}
export function activateContactTypes(id: number) {
  return contactTypesRequest<ContactTypesRecord>(`/${id}/activate`, { method: "POST" });
}
export function deactivateContactTypes(id: number) {
  return contactTypesRequest<ContactTypesRecord>(`/${id}/deactivate`, { method: "POST" });
}
export function forceDeleteContactTypes(id: number) {
  return contactTypesRequest<ContactTypesRecord>(`/${id}/force`, { method: "DELETE" });
}
