import type { Kysely } from "kysely";
import { sql } from "kysely";
import type { CoreDatabase } from "../../../../database/core-database.js";

export const hsnCodesMigration = {
  description: "HSN Codes master data.",
  key: "core.common.products.hsnCodes"
};

export function migrateHsnCodes(database: Kysely<CoreDatabase>) {
  return sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS hsn_codes (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(255) NOT NULL,
      description VARCHAR(255) NOT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'active',
      sort_order INT NOT NULL DEFAULT 1000,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY hsn_codes_code_unique (code)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `
    )
    .execute(database);
}
