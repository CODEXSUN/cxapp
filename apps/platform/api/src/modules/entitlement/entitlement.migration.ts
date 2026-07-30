import { sql, type Kysely } from "kysely";
import type { PlatformDatabase } from "../../database/schema.js";

export async function migrateEntitlementModule(db: Kysely<PlatformDatabase>) {
  await db.schema
    .createTable("entitlements")
    .ifNotExists()
    .addColumn("id", "integer", (column) => column.primaryKey().autoIncrement())
    .addColumn("uuid", "varchar(8)", (column) => column.notNull().unique())
    .addColumn("scope", "varchar(24)", (column) => column.notNull())
    .addColumn("tenant_id", "integer")
    .addColumn("plan_id", "integer")
    .addColumn("app_id", "integer", (column) => column.notNull())
    .addColumn("module_key", "varchar(120)", (column) => column.notNull())
    .addColumn("starts_on", "date", (column) => column.notNull())
    .addColumn("ends_on", "date")
    .addColumn("source", "varchar(24)", (column) => column.notNull())
    .addColumn("status", "varchar(24)", (column) => column.notNull())
    .addColumn("created_at", "datetime", (column) =>
      column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .addColumn("updated_at", "datetime", (column) =>
      column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .execute();
}
