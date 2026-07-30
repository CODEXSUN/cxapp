import { EntitlementRepository } from "./entitlement.repository.js";
import { EntitlementAccessService } from "./entitlement.access.js";
import { PlatformActivityService } from "../platform-activity/index.js";
import type { EntitlementSavePayload, PlanAccessSavePayload } from "./entitlement.types.js";

export class EntitlementService {
  constructor(
    private readonly repository = new EntitlementRepository(),
    private readonly access = new EntitlementAccessService(repository),
    private readonly activity = new PlatformActivityService()
  ) {}

  listEntitlements() {
    return this.repository.list();
  }

  getPlanAccess(planId: string) {
    return this.repository.getPlanAccess(Number(planId));
  }

  async savePlanAccess(planId: string, input: PlanAccessSavePayload) {
    const moduleKeys = normalizePlanAccessKeys(input.moduleKeys);
    const access = await this.repository.setPlanAccess(Number(planId), moduleKeys);
    if (access) await this.access.refreshTenantsForPlan(Number(planId));
    if (access) {
      await this.activity.recordActivity({
        action: "plan-access.saved",
        details: { moduleKeys },
        moduleKey: "platform.plan-access",
        recordId: access.planId,
        recordLabel: access.planName
      });
    }
    return access;
  }

  listTenantAccess() {
    return this.repository.listTenantAccessSummaries();
  }

  async createEntitlement(input: EntitlementSavePayload) {
    validate(input);
    const entitlement = await this.repository.create(input);
    await this.refreshAccess(input);
    await this.activity.recordActivity({
      action: "entitlement.created",
      details: input,
      moduleKey: "platform.entitlement",
      recordId: entitlement?.id ?? null,
      recordLabel: input.moduleKey,
      recordUuid: entitlement?.uuid ?? null
    });
    return entitlement;
  }

  async updateEntitlement(id: string, input: EntitlementSavePayload) {
    validate(input);
    const entitlement = await this.repository.update(Number(id), input);
    await this.refreshAccess(input);
    await this.activity.recordActivity({
      action: "entitlement.updated",
      details: input,
      moduleKey: "platform.entitlement",
      recordId: entitlement?.id ?? Number(id),
      recordLabel: input.moduleKey,
      recordUuid: entitlement?.uuid ?? null
    });
    return entitlement;
  }

  private async refreshAccess(input: EntitlementSavePayload) {
    if (input.scope === "tenant" && input.tenantId) {
      await this.access.refreshTenantAccess(input.tenantId);
    }
    if (input.scope === "plan" && input.planId) {
      await this.access.refreshTenantsForPlan(input.planId);
    }
  }
}

function validate(input: EntitlementSavePayload) {
  if (!input.appId || input.appId < 1) {
    throw new Error("App is required.");
  }
  if (!input.moduleKey?.trim()) {
    throw new Error("Module key is required.");
  }
  if (input.scope === "tenant" && (!input.tenantId || input.tenantId < 1)) {
    throw new Error("Tenant is required for tenant entitlements.");
  }
  if (input.scope === "plan" && (!input.planId || input.planId < 1)) {
    throw new Error("Plan is required for plan entitlements.");
  }
}

export function normalizePlanAccessKeys(moduleKeys: string[]) {
  return Array.from(
    new Set([
      "platform.application",
      ...(moduleKeys ?? [])
        .filter((key) => typeof key === "string" && key.trim())
        .map((key) => key.trim())
    ])
  ).sort();
}
