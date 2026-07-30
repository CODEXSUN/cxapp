import type { Kysely } from "kysely";
import type { CoreDatabase } from "../../../../database/core-database.js";
import { sql } from "kysely";

export const districtMigration = {
  description: "District master data owned by the District module.",
  key: "core.common.location.district"
};

export function migrateDistrictModule(database: Kysely<CoreDatabase>) {
  return sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS districts (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      state_id INT NOT NULL,
      name VARCHAR(200) NOT NULL,
      sort_order INT(11) NOT NULL DEFAULT 1000,
      status VARCHAR(24) NOT NULL DEFAULT 'active',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY districts_state_name_unique (state_id, name),
      INDEX districts_state_id_idx (state_id),
      CONSTRAINT districts_state_id_fk FOREIGN KEY (state_id) REFERENCES states(id) ON UPDATE CASCADE ON DELETE RESTRICT
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `
    )
    .execute(database);
}
