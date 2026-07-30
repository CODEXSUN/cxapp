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
