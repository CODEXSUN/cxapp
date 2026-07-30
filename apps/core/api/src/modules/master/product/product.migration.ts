import { sql, type Kysely } from "kysely";
import type { CoreDatabase } from "../../../database/core-database.js";

export const productMigration = {
  description: "Product master data.",
  key: "core.master.product"
} as const;

export async function migrateProductModule(database: Kysely<CoreDatabase>) {
  await sql
    .raw(
      `CREATE TABLE IF NOT EXISTS core_products (
    created_by VARCHAR(191) NOT NULL DEFAULT 'system:migration',
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
    INDEX products_status_name (status, name),
    CONSTRAINT products_type_fk FOREIGN KEY (product_type_id) REFERENCES core_product_types(id) ON DELETE RESTRICT,
    CONSTRAINT products_category_fk FOREIGN KEY (product_category_id) REFERENCES core_product_categories(id) ON DELETE RESTRICT,
    CONSTRAINT products_hsn_fk FOREIGN KEY (hsn_code_id) REFERENCES core_hsn_codes(id) ON DELETE RESTRICT,
    CONSTRAINT products_unit_fk FOREIGN KEY (unit_id) REFERENCES core_units(id) ON DELETE RESTRICT,
    CONSTRAINT products_tax_fk FOREIGN KEY (gst_tax_id) REFERENCES core_taxes(id) ON DELETE RESTRICT
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
    .execute(database);
}
