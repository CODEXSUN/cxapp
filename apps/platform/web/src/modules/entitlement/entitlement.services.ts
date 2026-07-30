import { apiGet, apiPost, apiPut } from "../../shared/api/platform-api";
import type { Entitlement, EntitlementSavePayload } from "./entitlement.types";

export function listEntitlements() {
  return apiGet<Entitlement[]>("/admin/entitlements", "sa");
}

export function createEntitlement(payload: EntitlementSavePayload) {
  return apiPost<Entitlement>("/admin/entitlements", payload, "sa");
}

export function updateEntitlement(id: number, payload: EntitlementSavePayload) {
  return apiPut<Entitlement>(`/admin/entitlements/${id}`, payload, "sa");
}
