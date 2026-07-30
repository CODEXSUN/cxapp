import { sql, type Kysely } from "kysely";
import type { PlatformDatabase } from "../../database/schema.js";
export async function migrateIndustryModule(db: Kysely<PlatformDatabase>) {
  await db.schema
    .createTable("industries")
    .ifNotExists()
    .addColumn("id", "integer", (c) => c.primaryKey().autoIncrement())
    .addColumn("uuid", "varchar(8)", (c) => c.notNull().unique())
    .addColumn("code", "varchar(64)", (c) => c.notNull().unique())
    .addColumn("name", "varchar(160)", (c) => c.notNull())
    .addColumn("description", "text", (c) => c.notNull())
    .addColumn("module_keys_json", "json", (c) => c.notNull())
    .addColumn("status", "varchar(24)", (c) => c.notNull())
    .addColumn("created_at", "datetime", (c) => c.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn("updated_at", "datetime", (c) => c.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();
}
