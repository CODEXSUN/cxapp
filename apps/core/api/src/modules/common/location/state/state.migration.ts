import type { Kysely } from "kysely";
import type { CoreDatabase } from "../../../../database/core-database.js";
import { sql } from "kysely";

export const stateMigration = {
  description: "State master data owned by the State module.",
  key: "core.common.location.state"
};

export function migrateStateModule(database: Kysely<CoreDatabase>) {
  return sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS states (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      country_id INT NOT NULL,
      code VARCHAR(80) NOT NULL,
      name VARCHAR(200) NOT NULL,
      sort_order INT(11) NOT NULL DEFAULT 1000,
      status VARCHAR(24) NOT NULL DEFAULT 'active',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY states_country_code_unique (country_id, code),
      UNIQUE KEY states_country_name_unique (country_id, name),
      INDEX states_country_id_idx (country_id),
      CONSTRAINT states_country_id_fk FOREIGN KEY (country_id) REFERENCES countries(id) ON UPDATE CASCADE ON DELETE RESTRICT
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `
    )
    .execute(database);
}
