import { sql, type Kysely } from "kysely";
import type { PlatformDatabase } from "../database/schema.js";

export const authSessionMigration = {
  description: "Revocable encrypted-cookie and JWT session registry.",
  key: "platform.auth-session.foundation"
} as const;

export async function migrateAuthSession(database: Kysely<PlatformDatabase>) {
  await database.schema
    .createTable("app_auth_sessions")
    .ifNotExists()
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("uuid", "varchar(8)", (col) => col.notNull().unique())
    .addColumn("jti", "varchar(64)", (col) => col.notNull().unique())
    .addColumn("user_type", "varchar(24)", (col) => col.notNull())
    .addColumn("user_uuid", "varchar(64)", (col) => col.notNull())
    .addColumn("user_email", "varchar(180)", (col) => col.notNull())
    .addColumn("user_name", "varchar(180)")
    .addColumn("tenant_id", "varchar(64)")
    .addColumn("tenant_code", "varchar(64)")
    .addColumn("tenant_db_name", "varchar(120)")
    .addColumn("tenant_access_mode", "varchar(24)", (col) => col.notNull())
    .addColumn("login_host", "varchar(191)", (col) => col.notNull())
    .addColumn("context_json", "json", (col) => col.notNull())
    .addColumn("expires_at", "datetime", (col) => col.notNull())
    .addColumn("last_seen_at", "datetime", (col) => col.notNull())
    .addColumn("revoked_at", "datetime")
    .addColumn("created_at", "datetime", (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn("updated_at", "datetime", (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn("status", "varchar(24)", (col) => col.notNull().defaultTo("active"))
    .addColumn("created_by", "varchar(191)", (col) => col.notNull().defaultTo("system:migration"))
    .execute();

  await database.schema
    .createIndex("auth_sessions_user_idx")
    .ifNotExists()
    .on("app_auth_sessions")
    .columns(["user_type", "user_uuid"])
    .execute();
  await database.schema
    .createIndex("auth_sessions_tenant_idx")
    .ifNotExists()
    .on("app_auth_sessions")
    .column("tenant_id")
    .execute();
  await database.schema
    .createIndex("auth_sessions_expiry_idx")
    .ifNotExists()
    .on("app_auth_sessions")
    .column("expires_at")
    .execute();
}
