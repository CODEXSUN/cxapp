import { sql, type Kysely } from "kysely";
import type { CoreDatabase } from "../../../database/core-database.js";

export const productMigration = {
  description: "Product master data.",
  key: "core.master.product"
} as const;

export async function migrateProductModule(database: Kysely<CoreDatabase>) {
  await sql
    .raw(
      `CREATE TABLE IF NOT EXISTS products (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(8) NOT NULL UNIQUE,
    name VARCHAR(191) NOT NULL,
    product_type_id INT NULL,
    product_category_id INT NULL,
    hsn_code_id INT NULL,
    unit_id INT NULL,
    gst_tax_id INT NULL,
    opening_qty DOUBLE NOT NULL DEFAULT 0,
    opening_price DOUBLE NOT NULL DEFAULT 0,
    status VARCHAR(24) NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    UNIQUE KEY products_name_unique (name),
    INDEX products_status_name (status, name)
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
    .execute(database);

  for (const suffix of ["addresses", "bank_accounts", "emails", "phones", "social_links"]) {
    await sql.raw(`DROP TABLE IF EXISTS products_${suffix}`).execute(database);
  }
}
