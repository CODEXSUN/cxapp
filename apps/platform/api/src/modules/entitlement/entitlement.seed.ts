import { createHash } from "node:crypto";
import { sql, type Kysely } from "kysely";
import type { PlatformDatabase } from "../../database/schema.js";

export const entitlementSeed = {
  key: "platform.entitlement.seed",
  description: "Always-enabled apps create plan-level entitlements for every active plan."
};

export async function seedEntitlementModule(db: Kysely<PlatformDatabase>) {
  const plans = await db
    .selectFrom("plans")
    .select(["id", "code"])
    .where("status", "=", "active")
    .execute();
  const apps = await db
    .selectFrom("platform_apps")
    .select(["id", "module_key"])
    .where("always_enabled", "=", true)
    .execute();

  for (const plan of plans) {
    for (const app of apps) {
      await db
        .insertInto("entitlements")
        .values({
          app_id: Number(app.id),
          ends_on: null,
          module_key: app.module_key,
          plan_id: Number(plan.id),
          scope: "plan",
          source: "seed",
          starts_on: new Date().toISOString().slice(0, 10),
          status: "active",
          tenant_id: null,
          uuid: stableUuid(`entitlement:plan:${plan.code}:${app.module_key}`)
        })
        .onDuplicateKeyUpdate({
          app_id: Number(app.id),
          module_key: app.module_key,
          plan_id: Number(plan.id),
          scope: "plan",
          source: "seed",
          status: "active",
          tenant_id: null,
          updated_at: sql`CURRENT_TIMESTAMP`
        })
        .execute();
    }
  }
}

function stableUuid(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 8);
}
