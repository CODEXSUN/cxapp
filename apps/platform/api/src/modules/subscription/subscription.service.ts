import { SubscriptionRepository } from "./subscription.repository.js";
import { EntitlementAccessService } from "../entitlement/entitlement.access.js";
import { PlatformActivityService } from "../platform-activity/index.js";
import type { SubscriptionSavePayload } from "./subscription.types.js";

export class SubscriptionService {
  constructor(
    private readonly repository = new SubscriptionRepository(),
    private readonly access = new EntitlementAccessService(),
    private readonly activity = new PlatformActivityService()
  ) {}

  listSubscriptions() {
    return this.repository.list();
  }

  async createSubscription(input: SubscriptionSavePayload) {
    validate(input);
    const subscription = await this.repository.create(input);
    await this.access.refreshTenantAccess(input.tenantId);
    await this.activity.recordActivity({
      action: "subscription.created",
      details: input,
      moduleKey: "platform.subscription",
      recordId: subscription?.id ?? null,
      recordLabel: subscription?.tenantName ?? String(input.tenantId),
      recordUuid: subscription?.uuid ?? null
    });
    return subscription;
  }

  async updateSubscription(id: string, input: SubscriptionSavePayload) {
    validate(input);
    const existing = await this.repository.find(Number(id));
    const subscription = await this.repository.update(Number(id), input);
    await this.access.refreshTenantAccess(input.tenantId);
    if (existing && existing.tenantId !== input.tenantId) {
      await this.access.refreshTenantAccess(existing.tenantId);
    }
    await this.activity.recordActivity({
      action: "subscription.updated",
      details: input,
      moduleKey: "platform.subscription",
      recordId: subscription?.id ?? Number(id),
      recordLabel: subscription?.tenantName ?? String(input.tenantId),
      recordUuid: subscription?.uuid ?? null
    });
    return subscription;
  }
}

function validate(input: SubscriptionSavePayload) {
  if (!input.tenantId || !input.planId || !input.startsOn)
    throw new Error("Tenant, plan, and start date are required.");
}
