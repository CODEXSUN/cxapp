import type { Kysely } from "kysely";
import type { PlatformDatabase } from "../../database/schema.js";

export async function seedDatabaseMaintenanceModule(_db: Kysely<PlatformDatabase>) {
  return {
    policy: "database maintenance runs are created by operator actions",
    seeded: 0
  } as const;
}
