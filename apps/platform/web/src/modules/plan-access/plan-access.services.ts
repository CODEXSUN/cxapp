import { apiGet, apiPut } from "../../shared/api/platform-api";
import type { PlanAccess, PlanAccessSavePayload } from "./plan-access.types";

export function getPlanAccess(planId: number) {
  return apiGet<PlanAccess>(`/admin/plans/${planId}/access`, "sa");
}

export function savePlanAccess(planId: number, payload: PlanAccessSavePayload) {
  return apiPut<PlanAccess>(`/admin/plans/${planId}/access`, payload, "sa");
}
