import { PlanRepository } from "./plan.repository.js";
import type { PlanSavePayload } from "./plan.types.js";
export class PlanService {
  constructor(private readonly repository = new PlanRepository()) {}
  listPlans() {
    return this.repository.list();
  }
  createPlan(input: PlanSavePayload) {
    validate(input);
    return this.repository.create(input);
  }
  updatePlan(id: string, input: PlanSavePayload) {
    validate(input);
    return this.repository.update(Number(id), input);
  }
}
function validate(input: PlanSavePayload) {
  if (!input.name?.trim() || !input.code?.trim())
    throw new Error("Plan name and code are required.");
  if (input.monthlyPrice < 0 || input.annualPrice < 0)
    throw new Error("Plan prices cannot be negative.");
}
