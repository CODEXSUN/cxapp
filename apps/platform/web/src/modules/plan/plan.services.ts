import { apiGet, apiPost, apiPut } from "../../shared/api/platform-api";
import type { Plan, PlanSavePayload } from "./plan.types";
type ApiPlan = Omit<Plan, "companyLimit" | "userLimit"> & {
  limits: { companies?: number; users?: number };
};
const fromApi = (plan: ApiPlan): Plan => ({
  ...plan,
  companyLimit: plan.limits.companies ?? 0,
  userLimit: plan.limits.users ?? 0
});
const toApi = (plan: PlanSavePayload) => ({
  ...plan,
  limits: { companies: plan.companyLimit, users: plan.userLimit }
});
export async function listPlans() {
  return (await apiGet<ApiPlan[]>("/admin/plans", "sa")).map(fromApi);
}
export async function createPlan(payload: PlanSavePayload) {
  return fromApi(await apiPost<ApiPlan>("/admin/plans", toApi(payload), "sa"));
}
export async function updatePlan(id: number, payload: PlanSavePayload) {
  return fromApi(await apiPut<ApiPlan>(`/admin/plans/${id}`, toApi(payload), "sa"));
}
