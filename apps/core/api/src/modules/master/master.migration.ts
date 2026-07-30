import type { Kysely } from "kysely";
import type { CoreDatabase } from "../../database/core-database.js";
import { contactMigration, migrateContactModule } from "./contact/contact.migration.js";
import { migrateProductModule, productMigration } from "./product/product.migration.js";
import { migrateWorkOrderModule, workOrderMigration } from "./work-order/work-order.migration.js";

export const masterMigration = {
  description: "Contact, product, and work-order master foundation.",
  key: "core.master.foundation-v1"
} as const;

export const masterMigrationSteps = [
  { ...contactMigration, migrate: migrateContactModule },
  { ...productMigration, migrate: migrateProductModule },
  { ...workOrderMigration, migrate: migrateWorkOrderModule }
] as const;

export async function migrateMasterModule(database: Kysely<CoreDatabase>) {
  for (const step of masterMigrationSteps) await step.migrate(database);
}
