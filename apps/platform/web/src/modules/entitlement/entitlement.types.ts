export type Entitlement = {
  appId: number;
  appLabel?: string;
  endsOn: string | null;
  id: number;
  moduleKey: string;
  planId: number | null;
  planName?: string | null;
  scope: "tenant" | "plan";
  source: "manual" | "seed" | "subscription";
  startsOn: string;
  status: "active" | "inactive";
  tenantId: number | null;
  tenantName?: string | null;
  uuid: string;
};

export type EntitlementSavePayload = Omit<
  Entitlement,
  "appLabel" | "id" | "planName" | "tenantName" | "uuid"
>;
