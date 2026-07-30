import { apiGet, apiPost, apiPut } from "../../shared/api/platform-api";
import type { Subscription, SubscriptionSavePayload } from "./subscription.types";
export function listSubscriptions() {
  return apiGet<Subscription[]>("/admin/subscriptions", "sa");
}
export function createSubscription(payload: SubscriptionSavePayload) {
  return apiPost<Subscription>("/admin/subscriptions", payload, "sa");
}
export function updateSubscription(id: number, payload: SubscriptionSavePayload) {
  return apiPut<Subscription>(`/admin/subscriptions/${id}`, payload, "sa");
}
