import type { Kysely } from "kysely";
import type { CoreDatabase } from "../../../../database/core-database.js";
import { sql } from "kysely";

export const pincodeMigration = {
  description: "Pincode data owned by the Pincode module.",
  key: "core.common.location.pincode"
};

export function migratePincodeModule(database: Kysely<CoreDatabase>) {
  return sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS pincodes (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      city_id INT NOT NULL,
      name VARCHAR(200) NOT NULL,
      area VARCHAR(200) NOT NULL,
      sort_order INT(11) NOT NULL DEFAULT 1000,
      status VARCHAR(24) NOT NULL DEFAULT 'active',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY pincodes_city_name_area_unique (city_id, name, area),
      INDEX pincodes_city_id_idx (city_id),
      CONSTRAINT pincodes_city_id_fk FOREIGN KEY (city_id) REFERENCES cities(id) ON UPDATE CASCADE ON DELETE RESTRICT
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `
    )
    .execute(database)
    .then(async () => {
      await upgradeExistingPincodes(database);
    });
}

async function upgradeExistingPincodes(database: Kysely<CoreDatabase>) {
  const areaColumn = await sql<{
    count: number | string;
  }>`SELECT COUNT(*) count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='pincodes' AND COLUMN_NAME='area'`.execute(
    database
  );
  if (Number(areaColumn.rows[0]?.count ?? 0) === 0) {
    await sql
      .raw("ALTER TABLE pincodes ADD COLUMN area VARCHAR(200) NOT NULL DEFAULT '' AFTER name")
      .execute(database);
    await sql
      .raw(
        "UPDATE pincodes SET area=CASE WHEN name LIKE '% - %' THEN TRIM(SUBSTRING_INDEX(name, ' - ', -1)) ELSE name END, name=CASE WHEN name LIKE '% - %' THEN TRIM(SUBSTRING_INDEX(name, ' - ', 1)) ELSE name END"
      )
      .execute(database);
    await sql
      .raw("ALTER TABLE pincodes MODIFY COLUMN area VARCHAR(200) NOT NULL")
      .execute(database);
  }
  const oldUnique = await sql<{
    count: number | string;
  }>`SELECT COUNT(*) count FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='pincodes' AND INDEX_NAME='pincodes_city_name_unique'`.execute(
    database
  );
  if (Number(oldUnique.rows[0]?.count ?? 0) > 0)
    await sql.raw("ALTER TABLE pincodes DROP INDEX pincodes_city_name_unique").execute(database);
  const newUnique = await sql<{
    count: number | string;
  }>`SELECT COUNT(*) count FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='pincodes' AND INDEX_NAME='pincodes_city_name_area_unique'`.execute(
    database
  );
  if (Number(newUnique.rows[0]?.count ?? 0) === 0)
    await sql
      .raw(
        "ALTER TABLE pincodes ADD UNIQUE KEY pincodes_city_name_area_unique (city_id, name, area)"
      )
      .execute(database);
}
