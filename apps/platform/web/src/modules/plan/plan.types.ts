export type Plan = {
  annualPrice: number;
  code: string;
  companyLimit: number;
  description: string;
  id: number;
  monthlyPrice: number;
  name: string;
  status: "active" | "inactive";
  userLimit: number;
  uuid: string;
};
export type PlanSavePayload = Omit<Plan, "id" | "uuid">;
