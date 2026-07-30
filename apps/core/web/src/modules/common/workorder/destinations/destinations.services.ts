import { getTenantDbName, getTenantId, getToken } from "../../../../shared/api/tenant-context";
import { requiredClientEnv } from "../../../../shared/env/client-env";
import type {
  DestinationsListFilters,
  DestinationsRecord,
  DestinationsSavePayload
} from "./destinations.types";

const coreApiBaseUrl = requiredClientEnv("VITE_PLATFORM_API_URL");
const destinationsPath = "/core/common/workorder/destinations";
type ApiEnvelope<T> = { data: T; success: true } | { error: { message: string }; success: false };

async function destinationsRequest<T>(suffix = "", options: RequestInit = {}) {
  const token = getToken("tenant");
  const tenantDbName = getTenantDbName();
  const response = await fetch(`${coreApiBaseUrl}${destinationsPath}${suffix}`, {
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
    throw new Error(envelope.success ? "Destinations request failed." : envelope.error.message);
  }
  return envelope.data;
}

export function listDestinations(filters: DestinationsListFilters = {}) {
  const query = new URLSearchParams();
  if (filters.search?.trim()) query.set("search", filters.search.trim());
  return destinationsRequest<DestinationsRecord[]>(query.size ? `?${query.toString()}` : "");
}
export function createDestinations(payload: DestinationsSavePayload) {
  return destinationsRequest<DestinationsRecord>("", {
    body: JSON.stringify(payload),
    method: "POST"
  });
}
export function updateDestinations(id: number, payload: DestinationsSavePayload) {
  return destinationsRequest<DestinationsRecord>(`/${id}`, {
    body: JSON.stringify(payload),
    method: "PUT"
  });
}
export function activateDestinations(id: number) {
  return destinationsRequest<DestinationsRecord>(`/${id}/activate`, { method: "POST" });
}
export function deactivateDestinations(id: number) {
  return destinationsRequest<DestinationsRecord>(`/${id}/deactivate`, { method: "POST" });
}
export function forceDeleteDestinations(id: number) {
  return destinationsRequest<DestinationsRecord>(`/${id}/force`, { method: "DELETE" });
}
