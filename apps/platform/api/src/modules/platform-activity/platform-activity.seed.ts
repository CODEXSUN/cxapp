import type { Kysely } from "kysely";
import type { PlatformDatabase } from "../../database/schema.js";
import { PlatformActivityRepository } from "./platform-activity.repository.js";

export async function seedPlatformActivityModule(_db: Kysely<PlatformDatabase>) {
  const repository = new PlatformActivityRepository();
  const existing = await repository.list(1);
  if (existing.length) return;
  await repository.record({
    action: "platform.seeded",
    moduleKey: "platform.activity",
    recordLabel: "Platform activity",
    details: { source: "seed" }
  });
}
