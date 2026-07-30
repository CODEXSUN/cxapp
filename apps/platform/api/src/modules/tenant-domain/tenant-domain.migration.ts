import { sql, type Kysely } from "kysely";
import type { PlatformDatabase } from "../../database/schema.js";

export const tenantDomainMigration = {
  key: "platform.tenant-domain.foundation",
  status: "active"
} as const;

export async function migrateTenantDomainModule(database: Kysely<PlatformDatabase>) {
  await database.schema
    .createTable("tenant_domains")
    .ifNotExists()
    .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
    .addColumn("uuid", "varchar(8)", (col) => col.notNull().unique())
    .addColumn("tenant_id", "integer", (col) => col.notNull())
    .addColumn("domain", "varchar(191)", (col) => col.notNull().unique())
    .addColumn("is_primary", "boolean", (col) => col.notNull().defaultTo(false))
    .addColumn("created_at", "datetime", (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();
}
