import { sql, type Kysely } from "kysely";
import type { PlatformDatabase } from "../database/schema.js";

export const authLoginAttemptMigration = {
  description: "Database-backed sign-in throttling shared across API processes.",
  key: "platform.auth-login-attempt.database-v1"
} as const;

export async function migrateAuthLoginAttempt(db: Kysely<PlatformDatabase>) {
  await db.schema
    .createTable("auth_login_attempts")
    .ifNotExists()
    .addColumn("id", "integer", (column) => column.primaryKey().autoIncrement())
    .addColumn("uuid", "varchar(8)", (column) =>
      column
        .notNull()
        .unique()
        .defaultTo(sql`LOWER(SUBSTRING(MD5(UUID()),1,8))`)
    )
    .addColumn("attempt_key_hash", "char(64)", (column) => column.notNull().unique())
    .addColumn("failure_count", "integer", (column) => column.notNull().defaultTo(0))
    .addColumn("blocked_until", "datetime", (column) => column.notNull())
    .addColumn("last_failed_at", "datetime", (column) => column.notNull())
    .addColumn("status", "varchar(24)", (column) => column.notNull().defaultTo("active"))
    .addColumn("created_by", "varchar(191)", (column) => column.notNull().defaultTo("system:auth"))
    .addColumn("created_at", "datetime", (column) =>
      column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .addColumn("updated_at", "datetime", (column) =>
      column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .modifyEnd(sql` ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)
    .execute();
  await db.schema
    .createIndex("auth_login_attempts_blocked_until_idx")
    .ifNotExists()
    .on("auth_login_attempts")
    .column("blocked_until")
    .execute();
}
