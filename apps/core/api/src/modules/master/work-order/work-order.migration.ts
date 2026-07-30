import { sql, type Kysely } from "kysely";
import type { CoreDatabase } from "../../../database/core-database.js";

export const workOrderMigration = {
  description: "Work-order master data.",
  key: "core.master.work-order"
} as const;

export async function migrateWorkOrderModule(database: Kysely<CoreDatabase>) {
  await sql
    .raw(
      `CREATE TABLE IF NOT EXISTS work_orders (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(8) NOT NULL UNIQUE,
    code VARCHAR(80) NOT NULL UNIQUE, name VARCHAR(191) NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'active', created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL, INDEX work_orders_status_code (status, code)
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
    .execute(database);
  for (const suffix of ["addresses", "bank_accounts", "emails", "phones", "social_links"])
    await sql.raw(`DROP TABLE IF EXISTS work_orders_${suffix}`).execute(database);
}
