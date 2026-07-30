import { sql, type Kysely } from "kysely";
import type { PlatformDatabase } from "../../database/schema.js";

export const appRegistryMigration = {
  key: "platform.app-registry.initial",
  description: "Initial platform application registry contract."
};

export async function migrateAppRegistryModule(database: Kysely<PlatformDatabase>) {
  await database.schema
    .createTable("platform_apps")
    .ifNotExists()
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("uuid", "varchar(8)", (col) => col.notNull().unique())
    .addColumn("app_id", "varchar(64)", (col) => col.notNull().unique())
    .addColumn("label", "varchar(120)", (col) => col.notNull())
    .addColumn("module_key", "varchar(160)", (col) => col.notNull().unique())
    .addColumn("stack", "varchar(64)", (col) => col.notNull())
    .addColumn("always_enabled", "boolean", (col) => col.notNull().defaultTo(false))
    .addColumn("default_landing", "boolean", (col) => col.notNull().defaultTo(false))
    .addColumn("description", "text", (col) => col.notNull())
    .addColumn("created_at", "datetime", (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn("updated_at", "datetime", (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();
}
