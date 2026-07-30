export type SubscriptionStatus = "active" | "cancelled" | "expired" | "trial";
export type Subscription = {
  billingCycle: "monthly" | "annual";
  endsOn: string | null;
  id: number;
  planId: number;
  planName: string;
  startsOn: string;
  status: SubscriptionStatus;
  tenantId: number;
  tenantName: string;
  uuid: string;
};
export type SubscriptionSavePayload = Pick<
  Subscription,
  "billingCycle" | "endsOn" | "planId" | "startsOn" | "status" | "tenantId"
>;
