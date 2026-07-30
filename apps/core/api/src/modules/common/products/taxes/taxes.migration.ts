import type { Kysely } from "kysely";
import { sql } from "kysely";
import type { CoreDatabase } from "../../../../database/core-database.js";

export const taxesMigration = {
  description: "Taxes master data.",
  key: "core.common.products.taxes"
};

export function migrateTaxes(database: Kysely<CoreDatabase>) {
  return sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS taxes (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      rate_percent DOUBLE NOT NULL,
      description VARCHAR(255) NOT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'active',
      sort_order INT NOT NULL DEFAULT 1000,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY taxes_rate_percent_unique (rate_percent)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `
    )
    .execute(database);
}
