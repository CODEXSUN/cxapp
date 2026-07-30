import type { Kysely } from "kysely";
import { createHash } from "node:crypto";
import type { PlatformDatabase } from "../../database/schema.js";
export async function seedPlanModule(db: Kysely<PlatformDatabase>) {
  for (const plan of [
    { code: "starter", name: "Starter", monthly: 0, annual: 0 },
    { code: "growth", name: "Growth", monthly: 2499, annual: 24990 }
  ])
    await db
      .insertInto("plans")
      .values({
        annual_price: plan.annual,
        code: plan.code,
        description: `${plan.name} platform plan`,
        limits_json: JSON.stringify({
          companies: plan.code === "starter" ? 1 : 10,
          users: plan.code === "starter" ? 3 : 50
        }),
        monthly_price: plan.monthly,
        name: plan.name,
        status: "active",
        uuid: createHash("sha256").update(`plan:${plan.code}`).digest("hex").slice(0, 8)
      })
      .onDuplicateKeyUpdate({ name: plan.name })
      .execute();
}
