import { getTenantDbName, getTenantId, getToken } from "../../../../shared/api/tenant-context";
import { requiredClientEnv } from "../../../../shared/env/client-env";
import type {
  ContactGroupsListFilters,
  ContactGroupsRecord,
  ContactGroupsSavePayload
} from "./contact-groups.types";

const coreApiBaseUrl = requiredClientEnv("VITE_PLATFORM_API_URL");
const contactGroupsPath = "/core/common/contacts/contact-groups";
type ApiEnvelope<T> = { data: T; success: true } | { error: { message: string }; success: false };

async function contactGroupsRequest<T>(suffix = "", options: RequestInit = {}) {
  const token = getToken("tenant");
  const tenantDbName = getTenantDbName();
  const response = await fetch(`${coreApiBaseUrl}${contactGroupsPath}${suffix}`, {
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
    throw new Error(envelope.success ? "ContactGroups request failed." : envelope.error.message);
  }
  return envelope.data;
}

export function listContactGroups(filters: ContactGroupsListFilters = {}) {
  const query = new URLSearchParams();
  if (filters.search?.trim()) query.set("search", filters.search.trim());
  return contactGroupsRequest<ContactGroupsRecord[]>(query.size ? `?${query.toString()}` : "");
}
export function createContactGroups(payload: ContactGroupsSavePayload) {
  return contactGroupsRequest<ContactGroupsRecord>("", {
    body: JSON.stringify(payload),
    method: "POST"
  });
}
export function updateContactGroups(id: number, payload: ContactGroupsSavePayload) {
  return contactGroupsRequest<ContactGroupsRecord>(`/${id}`, {
    body: JSON.stringify(payload),
    method: "PUT"
  });
}
export function activateContactGroups(id: number) {
  return contactGroupsRequest<ContactGroupsRecord>(`/${id}/activate`, { method: "POST" });
}
export function deactivateContactGroups(id: number) {
  return contactGroupsRequest<ContactGroupsRecord>(`/${id}/deactivate`, { method: "POST" });
}
export function forceDeleteContactGroups(id: number) {
  return contactGroupsRequest<ContactGroupsRecord>(`/${id}/force`, { method: "DELETE" });
}
