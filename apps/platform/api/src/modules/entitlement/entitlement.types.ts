export type EntitlementScope = "tenant" | "plan";
export type EntitlementSource = "manual" | "seed" | "subscription";
export type EntitlementStatus = "active" | "inactive";

export type Entitlement = {
  appId: number;
  appLabel?: string;
  endsOn: string | null;
  id: number;
  moduleKey: string;
  planId: number | null;
  planName?: string | null;
  scope: EntitlementScope;
  source: EntitlementSource;
  startsOn: string;
  status: EntitlementStatus;
  tenantId: number | null;
  tenantName?: string | null;
  uuid: string;
};

export type EntitlementSavePayload = Omit<
  Entitlement,
  "appLabel" | "id" | "planName" | "tenantName" | "uuid"
>;

export type PlanAccessApp = {
  appId: number;
  appLabel: string;
  enabled: boolean;
  moduleKey: string;
};

export type PlanAccess = {
  apps: PlanAccessApp[];
  planId: number;
  planName: string;
};

export type PlanAccessSavePayload = {
  moduleKeys: string[];
};

export type TenantAccessSummary = {
  activeSubscription?: {
    billingCycle: string;
    planId: number;
    planName: string;
    status: string;
  } | null;
  enabledModuleKeys: string[];
  manualModuleKeys: string[];
  planModuleKeys: string[];
  tenantCode: string;
  tenantId: number;
  tenantName: string;
  uuid: string;
};
