import type { Kysely } from "kysely";
import type { CoreDatabase } from "../../../../database/core-database.js";
import { sql } from "kysely";

export const cityMigration = {
  description: "City master data owned by the City module.",
  key: "core.common.location.city"
};

export function migrateCityModule(database: Kysely<CoreDatabase>) {
  return sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS cities (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      district_id INT NOT NULL,
      name VARCHAR(200) NOT NULL,
      sort_order INT(11) NOT NULL DEFAULT 1000,
      status VARCHAR(24) NOT NULL DEFAULT 'active',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY cities_district_name_unique (district_id, name),
      INDEX cities_district_id_idx (district_id),
      CONSTRAINT cities_district_id_fk FOREIGN KEY (district_id) REFERENCES districts(id) ON UPDATE CASCADE ON DELETE RESTRICT
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `
    )
    .execute(database);
}
