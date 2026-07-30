import type { Kysely } from "kysely";
import type { CoreDatabase } from "../../../../database/core-database.js";
import { sql } from "kysely";

export const countryMigration = {
  description: "Country master data.",
  key: "core.common.location.country"
};

export function migrateCountryModule(database: Kysely<CoreDatabase>) {
  return sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS countries (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(80) NOT NULL UNIQUE,
      name VARCHAR(200) NOT NULL,
      sort_order INT(11) NOT NULL DEFAULT 1000,
      status VARCHAR(24) NOT NULL DEFAULT 'active',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY countries_name_unique (name)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `
    )
    .execute(database);
}
