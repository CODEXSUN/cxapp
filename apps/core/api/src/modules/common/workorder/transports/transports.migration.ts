import type { Kysely } from "kysely";
import { sql } from "kysely";
import type { CoreDatabase } from "../../../../database/core-database.js";

export const transportsMigration = {
  description: "Transports master data.",
  key: "core.common.workorder.transports"
};

export function migrateTransports(database: Kysely<CoreDatabase>) {
  return sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS transports (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      gst VARCHAR(255) NULL,
      vehicle_no VARCHAR(255) NULL,
      address VARCHAR(255) NULL,
      contact_no VARCHAR(255) NULL,
      contact_person VARCHAR(255) NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'active',
      sort_order INT NOT NULL DEFAULT 1000,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY transports_name_unique (name)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `
    )
    .execute(database);
}
