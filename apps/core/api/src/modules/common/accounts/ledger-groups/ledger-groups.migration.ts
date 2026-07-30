import { sql, type Kysely } from "kysely";
import type { CoreDatabase } from "../../../../database/core-database.js";

export const ledgerGroupsMigration = {
  description: "Ledger group master data.",
  key: "core.common.accounts.ledger-groups"
} as const;

export async function migrateLedgerGroups(database: Kysely<CoreDatabase>) {
  await sql
    .raw(
      `CREATE TABLE IF NOT EXISTS ledger_groups (id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,name VARCHAR(200) NOT NULL,status VARCHAR(24) NOT NULL DEFAULT 'active',created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,UNIQUE KEY ledger_groups_name_unique(name),INDEX ledger_groups_status_name(status,name)) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
    .execute(database);
}
