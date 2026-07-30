import { sql, type Kysely } from "kysely";
import type { PlatformDatabase } from "../../database/schema.js";

export const credentialRecoveryMigration = {
  description: "Persisted platform credentials and one-time password recovery tokens.",
  key: "platform.credential-recovery.foundation"
} as const;

export async function migrateCredentialRecoveryModule(database: Kysely<PlatformDatabase>) {
  await database.schema
    .createTable("app_platform_auth_users")
    .ifNotExists()
    .addColumn("id", "integer", (column) => column.primaryKey().autoIncrement())
    .addColumn("uuid", "varchar(8)", (column) => column.notNull().unique())
    .addColumn("user_type", "varchar(24)", (column) => column.notNull())
    .addColumn("email", "varchar(190)", (column) => column.notNull())
    .addColumn("name", "varchar(160)", (column) => column.notNull())
    .addColumn("password_hash", "varchar(255)", (column) => column.notNull())
    .addColumn("status", "varchar(24)", (column) => column.notNull().defaultTo("active"))
    .addColumn("created_at", "datetime", (column) =>
      column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .addColumn("updated_at", "datetime", (column) =>
      column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .addUniqueConstraint("platform_auth_users_type_email_unique", ["user_type", "email"])
    .addColumn("created_by", "varchar(191)", (col) => col.notNull().defaultTo("system:migration"))
    .execute();

  await database.schema
    .createTable("app_password_reset_requests")
    .ifNotExists()
    .addColumn("id", "integer", (column) => column.primaryKey().autoIncrement())
    .addColumn("uuid", "varchar(8)", (column) => column.notNull().unique())
    .addColumn("token_hash", "varchar(64)", (column) => column.notNull().unique())
    .addColumn("desk", "varchar(24)", (column) => column.notNull())
    .addColumn("email", "varchar(190)", (column) => column.notNull())
    .addColumn("user_uuid", "varchar(8)", (column) => column.notNull())
    .addColumn("tenant_id", "varchar(80)")
    .addColumn("tenant_database", "varchar(120)")
    .addColumn("expires_at", "datetime", (column) => column.notNull())
    .addColumn("consumed_at", "datetime")
    .addColumn("created_at", "datetime", (column) =>
      column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .addColumn("status", "varchar(24)", (col) => col.notNull().defaultTo("active"))
    .addColumn("created_by", "varchar(191)", (col) => col.notNull().defaultTo("system:migration"))
    .addColumn("updated_at", "datetime", (col) =>
      col
        .notNull()
        .defaultTo(sql`CURRENT_TIMESTAMP`)
        .modifyEnd(sql`ON UPDATE CURRENT_TIMESTAMP`)
    )
    .execute();
  await database.schema
    .createIndex("password_reset_requests_lookup_idx")
    .ifNotExists()
    .on("app_password_reset_requests")
    .columns(["token_hash", "expires_at", "consumed_at"])
    .execute();
}
