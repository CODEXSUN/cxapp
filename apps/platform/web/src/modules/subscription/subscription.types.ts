export type Subscription = {
  billingCycle: "monthly" | "annual";
  endsOn: string | null;
  id: number;
  planId: number;
  planName?: string;
  startsOn: string;
  status: "active" | "cancelled" | "expired" | "trial";
  tenantId: number;
  tenantName?: string;
  uuid: string;
};
export type SubscriptionSavePayload = Omit<Subscription, "id" | "planName" | "tenantName" | "uuid">;
