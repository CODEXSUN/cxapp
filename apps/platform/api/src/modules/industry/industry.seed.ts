import { createHash } from "node:crypto";
import type { Kysely } from "kysely";
import type { PlatformDatabase } from "../../database/schema.js";
export async function seedIndustryModule(db: Kysely<PlatformDatabase>) {
  for (const item of [
    { code: "general", name: "General Business" },
    { code: "retail", name: "Retail" }
  ])
    await db
      .insertInto("industries")
      .values({
        code: item.code,
        description: `${item.name} defaults`,
        module_keys_json: JSON.stringify(["platform.application"]),
        name: item.name,
        status: "active",
        uuid: createHash("sha256").update(`industry:${item.code}`).digest("hex").slice(0, 8)
      })
      .onDuplicateKeyUpdate({ name: item.name })
      .execute();
}
