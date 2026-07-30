import { sql, type Kysely } from "kysely";
import type { PlatformDatabase } from "../../database/schema.js";

export async function migrateAccessControlModule(db: Kysely<PlatformDatabase>) {
  await db.schema
    .createTable("access_permissions")
    .ifNotExists()
    .addColumn("id", "integer", (c) => c.primaryKey().autoIncrement())
    .addColumn("uuid", "varchar(8)", (c) => c.notNull().unique())
    .addColumn("key", "varchar(120)", (c) => c.notNull().unique())
    .addColumn("label", "varchar(160)", (c) => c.notNull())
    .addColumn("description", "text", (c) => c.notNull())
    .addColumn("status", "varchar(24)", (c) => c.notNull())
    .addColumn("created_at", "datetime", (c) => c.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn("updated_at", "datetime", (c) => c.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();
  await db.schema
    .createTable("access_roles")
    .ifNotExists()
    .addColumn("id", "integer", (c) => c.primaryKey().autoIncrement())
    .addColumn("uuid", "varchar(8)", (c) => c.notNull().unique())
    .addColumn("key", "varchar(120)", (c) => c.notNull().unique())
    .addColumn("label", "varchar(160)", (c) => c.notNull())
    .addColumn("description", "text", (c) => c.notNull())
    .addColumn("permission_keys_json", "json", (c) => c.notNull())
    .addColumn("status", "varchar(24)", (c) => c.notNull())
    .addColumn("created_at", "datetime", (c) => c.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn("updated_at", "datetime", (c) => c.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();
  await db.schema
    .createTable("access_users")
    .ifNotExists()
    .addColumn("id", "integer", (c) => c.primaryKey().autoIncrement())
    .addColumn("uuid", "varchar(8)", (c) => c.notNull().unique())
    .addColumn("email", "varchar(190)", (c) => c.notNull().unique())
    .addColumn("name", "varchar(160)", (c) => c.notNull())
    .addColumn("role_key", "varchar(120)", (c) => c.notNull())
    .addColumn("status", "varchar(24)", (c) => c.notNull())
    .addColumn("created_at", "datetime", (c) => c.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn("updated_at", "datetime", (c) => c.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();
}
