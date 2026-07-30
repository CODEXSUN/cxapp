export type PlanStatus = "active" | "inactive";
export type Plan = {
  annualPrice: number;
  code: string;
  description: string;
  id: number;
  limits: Record<string, number>;
  monthlyPrice: number;
  name: string;
  status: PlanStatus;
  uuid: string;
};
export type PlanSavePayload = Omit<Plan, "id" | "uuid">;
