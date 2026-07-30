import type { Kysely } from "kysely";
import type { PlatformDatabase } from "../../database/schema.js";
import { reconcileLegacyDuplicateRuns } from "./database-maintenance.migration.js";

export async function seedDatabaseMaintenanceModule(db: Kysely<PlatformDatabase>) {
  await reconcileLegacyDuplicateRuns(db);
  return {
    policy: "database maintenance runs are created by operator actions and reconciled on startup",
    seeded: 0
  } as const;
}
