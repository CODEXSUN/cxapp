import { sql, type Kysely } from "kysely";
import type { CoreDatabase } from "../../../../database/core-database.js";

export const ledgersMigration = {
  description: "Ledger master data.",
  key: "core.common.accounts.ledgers"
} as const;

export async function migrateLedgers(database: Kysely<CoreDatabase>) {
  await sql
    .raw(
      `CREATE TABLE IF NOT EXISTS ledgers (id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,ledger_group_id INT NOT NULL,name VARCHAR(200) NOT NULL,status VARCHAR(24) NOT NULL DEFAULT 'active',created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,UNIQUE KEY ledgers_group_name_unique(ledger_group_id,name),INDEX ledgers_status_name(status,name),CONSTRAINT ledgers_group_fk FOREIGN KEY (ledger_group_id) REFERENCES ledger_groups(id)) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
    .execute(database);
}
