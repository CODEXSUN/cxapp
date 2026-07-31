import type { Kysely } from "kysely";
import type { PlatformDatabase } from "../../database/schema.js";
import { env } from "../../env.js";

export async function seedQueueManagerModule(db: Kysely<PlatformDatabase>) {
  await db
    .insertInto("queue_runtime_settings")
    .values({
      backend: env.CXAPP_QUEUE_BACKEND,
      singleton_key: 1,
      updated_by: "environment-seed"
    })
    .ignore()
    .execute();
  await db
    .updateTable("queue_runtime_settings")
    .set({
      backend: "database",
      updated_at: new Date(),
      updated_by: "system:memory-backend-retirement"
    })
    .where("backend", "=", "memory" as never)
    .execute();
  return { backend: env.CXAPP_QUEUE_BACKEND, seeded: 1 } as const;
}
