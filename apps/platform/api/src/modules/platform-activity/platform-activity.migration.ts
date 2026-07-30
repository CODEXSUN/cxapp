import { sql, type Kysely } from "kysely";
import type { PlatformDatabase } from "../../database/schema.js";

export async function migratePlatformActivityModule(db: Kysely<PlatformDatabase>) {
  await db.schema
    .createTable("platform_activity")
    .ifNotExists()
    .addColumn("id", "integer", (column) => column.primaryKey().autoIncrement())
    .addColumn("uuid", "varchar(8)", (column) => column.notNull().unique())
    .addColumn("module_key", "varchar(120)", (column) => column.notNull())
    .addColumn("action", "varchar(120)", (column) => column.notNull())
    .addColumn("record_id", "integer")
    .addColumn("record_uuid", "varchar(8)")
    .addColumn("record_label", "varchar(190)", (column) => column.notNull())
    .addColumn("actor_email", "varchar(190)", (column) => column.notNull())
    .addColumn("details_json", "json", (column) => column.notNull())
    .addColumn("created_at", "datetime", (column) =>
      column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .execute();
}
