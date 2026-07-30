import { randomBytes } from "node:crypto";
import { getPlatformDatabase } from "../../database/platform-database.js";
import type { SubscriptionSavePayload } from "./subscription.types.js";

export class SubscriptionRepository {
  async list() {
    const rows = await getPlatformDatabase()
      .selectFrom("app_subscriptions")
      .innerJoin("app_tenants", "app_tenants.id", "app_subscriptions.tenant_id")
      .innerJoin("app_plans", "app_plans.id", "app_subscriptions.plan_id")
      .select([
        "app_subscriptions.id",
        "app_subscriptions.uuid",
        "app_subscriptions.tenant_id",
        "app_subscriptions.plan_id",
        "app_subscriptions.billing_cycle",
        "app_subscriptions.starts_on",
        "app_subscriptions.ends_on",
        "app_subscriptions.status",
        "app_tenants.tenant_name",
        "app_plans.name as plan_name"
      ])
      .orderBy("app_tenants.tenant_name")
      .execute();
    return rows.map(toSubscription);
  }

  async create(input: SubscriptionSavePayload) {
    const result = await getPlatformDatabase()
      .insertInto("app_subscriptions")
      .values({
        billing_cycle: input.billingCycle,
        ends_on: input.endsOn,
        plan_id: input.planId,
        starts_on: input.startsOn,
        status: input.status,
        tenant_id: input.tenantId,
        uuid: randomBytes(4).toString("hex")
      })
      .executeTakeFirst();
    return this.find(Number(result.insertId));
  }

  async update(id: number, input: SubscriptionSavePayload) {
    await getPlatformDatabase()
      .updateTable("app_subscriptions")
      .set({
        billing_cycle: input.billingCycle,
        ends_on: input.endsOn,
        plan_id: input.planId,
        starts_on: input.startsOn,
        status: input.status,
        tenant_id: input.tenantId
      })
      .where("id", "=", id)
      .execute();
    return this.find(id);
  }

  async find(id: number) {
    const row = await getPlatformDatabase()
      .selectFrom("app_subscriptions")
      .innerJoin("app_tenants", "app_tenants.id", "app_subscriptions.tenant_id")
      .innerJoin("app_plans", "app_plans.id", "app_subscriptions.plan_id")
      .select([
        "app_subscriptions.id",
        "app_subscriptions.uuid",
        "app_subscriptions.tenant_id",
        "app_subscriptions.plan_id",
        "app_subscriptions.billing_cycle",
        "app_subscriptions.starts_on",
        "app_subscriptions.ends_on",
        "app_subscriptions.status",
        "app_tenants.tenant_name",
        "app_plans.name as plan_name"
      ])
      .where("app_subscriptions.id", "=", id)
      .executeTakeFirst();
    return row ? toSubscription(row) : null;
  }
}

function toSubscription(row: {
  billing_cycle: "monthly" | "annual";
  ends_on: string | null;
  id: number;
  plan_id: number;
  plan_name: string;
  starts_on: string;
  status: "active" | "cancelled" | "expired" | "trial";
  tenant_id: number;
  tenant_name: string;
  uuid: string;
}) {
  return {
    billingCycle: row.billing_cycle,
    endsOn: row.ends_on,
    id: Number(row.id),
    planId: Number(row.plan_id),
    planName: row.plan_name,
    startsOn: row.starts_on,
    status: row.status,
    tenantId: Number(row.tenant_id),
    tenantName: row.tenant_name,
    uuid: row.uuid
  };
}
