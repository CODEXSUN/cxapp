import { randomBytes } from "node:crypto";
import { getPlatformDatabase } from "../../database/platform-database.js";
import type { SubscriptionSavePayload } from "./subscription.types.js";

export class SubscriptionRepository {
  async list() {
    const rows = await getPlatformDatabase()
      .selectFrom("subscriptions")
      .innerJoin("tenants", "tenants.id", "subscriptions.tenant_id")
      .innerJoin("plans", "plans.id", "subscriptions.plan_id")
      .select([
        "subscriptions.id",
        "subscriptions.uuid",
        "subscriptions.tenant_id",
        "subscriptions.plan_id",
        "subscriptions.billing_cycle",
        "subscriptions.starts_on",
        "subscriptions.ends_on",
        "subscriptions.status",
        "tenants.tenant_name",
        "plans.name as plan_name"
      ])
      .orderBy("tenants.tenant_name")
      .execute();
    return rows.map(toSubscription);
  }

  async create(input: SubscriptionSavePayload) {
    const result = await getPlatformDatabase()
      .insertInto("subscriptions")
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
      .updateTable("subscriptions")
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
      .selectFrom("subscriptions")
      .innerJoin("tenants", "tenants.id", "subscriptions.tenant_id")
      .innerJoin("plans", "plans.id", "subscriptions.plan_id")
      .select([
        "subscriptions.id",
        "subscriptions.uuid",
        "subscriptions.tenant_id",
        "subscriptions.plan_id",
        "subscriptions.billing_cycle",
        "subscriptions.starts_on",
        "subscriptions.ends_on",
        "subscriptions.status",
        "tenants.tenant_name",
        "plans.name as plan_name"
      ])
      .where("subscriptions.id", "=", id)
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
