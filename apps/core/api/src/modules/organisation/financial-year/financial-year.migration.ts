import { sql, type Kysely } from "kysely";
import type { CoreDatabase } from "../../../database/core-database.js";

export const financialYearMigration = {
  description: "Tenant financial-year master data.",
  key: "core.organisation.financial-year"
} as const;

export async function migrateFinancialYearModule(database: Kysely<CoreDatabase>) {
  await sql
    .raw(
      `CREATE TABLE IF NOT EXISTS financial_years (id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,uuid CHAR(36) NOT NULL,name VARCHAR(120) NOT NULL,start_date DATE NOT NULL,end_date DATE NOT NULL,is_current TINYINT(1) NOT NULL DEFAULT 0,status VARCHAR(24) NOT NULL DEFAULT 'active',created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,UNIQUE KEY financial_years_uuid_unique(uuid),UNIQUE KEY financial_years_name_unique(name),UNIQUE KEY financial_years_dates_unique(start_date,end_date),INDEX financial_years_status_dates(status,start_date,end_date),INDEX financial_years_current(is_current)) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
    .execute(database);
}
