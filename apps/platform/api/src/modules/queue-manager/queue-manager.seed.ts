import type { Kysely } from "kysely";
import type { PlatformDatabase } from "../../database/schema.js";
import { env } from "../../env.js";

export async function seedQueueManagerModule(db: Kysely<PlatformDatabase>) {
  await db
    .insertInto("app_queue_runtime_settings")
    .values({
      backend: env.CODEXSUN_QUEUE_BACKEND,
      singleton_key: 1,
      updated_by: "environment-seed"
    })
    .ignore()
    .execute();
  return { backend: env.CODEXSUN_QUEUE_BACKEND, seeded: 1 } as const;
}
