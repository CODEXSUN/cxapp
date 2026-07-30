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
