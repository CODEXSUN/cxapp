import { sql, type Kysely } from "kysely";
import type { PlatformDatabase } from "../../database/schema.js";

export const tenantDomainMigration = {
  key: "platform.tenant-domain.foundation",
  status: "active"
} as const;

export async function migrateTenantDomainModule(database: Kysely<PlatformDatabase>) {
  await database.schema
    .createTable("app_tenant_domains")
    .ifNotExists()
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("uuid", "varchar(8)", (col) => col.notNull().unique())
    .addColumn("tenant_id", "integer", (col) => col.notNull())
    .addColumn("domain", "varchar(191)", (col) => col.notNull().unique())
    .addColumn("is_primary", "boolean", (col) => col.notNull().defaultTo(false))
    .addColumn("status", "varchar(24)", (col) => col.notNull().defaultTo("disabled"))
    .addColumn("verification_status", "varchar(24)", (col) => col.notNull().defaultTo("pending"))
    .addColumn("verification_token_hash", "varchar(64)")
    .addColumn("verified_at", "datetime")
    .addForeignKeyConstraint(
      "app_tenant_domains_tenant_fk",
      ["tenant_id"],
      "app_tenants",
      ["id"],
      (constraint) => constraint.onDelete("cascade")
    )
    .addColumn("created_at", "datetime", (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn("created_by", "varchar(191)", (col) => col.notNull().defaultTo("system:migration"))
    .addColumn("updated_at", "datetime", (col) =>
      col
        .notNull()
        .defaultTo(sql`CURRENT_TIMESTAMP`)
        .modifyEnd(sql`ON UPDATE CURRENT_TIMESTAMP`)
    )
    .execute();
  await sql`ALTER TABLE app_tenant_domains ADD COLUMN IF NOT EXISTS status VARCHAR(24) NOT NULL DEFAULT 'disabled'`.execute(
    database
  );
  await sql`ALTER TABLE app_tenant_domains ADD COLUMN IF NOT EXISTS verification_status VARCHAR(24) NOT NULL DEFAULT 'pending'`.execute(
    database
  );
  await sql`ALTER TABLE app_tenant_domains ADD COLUMN IF NOT EXISTS verification_token_hash VARCHAR(64) NULL`.execute(
    database
  );
  await sql`ALTER TABLE app_tenant_domains ADD COLUMN IF NOT EXISTS verified_at DATETIME NULL`.execute(
    database
  );
}
