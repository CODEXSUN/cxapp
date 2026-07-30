import { sql, type Kysely } from "kysely";
import type { CoreDatabase } from "../../../database/core-database.js";

export const defaultCompanyMigration = {
  description: "Tenant default company and financial-year selection.",
  key: "core.organisation.default-company"
} as const;

export async function migrateDefaultCompanyModule(database: Kysely<CoreDatabase>) {
  await sql
    .raw(
      `CREATE TABLE IF NOT EXISTS default_company_settings (id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,singleton_key TINYINT NOT NULL DEFAULT 1,company_id INT NOT NULL,financial_year_id INT NOT NULL,landing_app VARCHAR(80) NOT NULL,status VARCHAR(24) NOT NULL DEFAULT 'active',created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,UNIQUE KEY default_company_singleton_unique(singleton_key),INDEX default_company_company(company_id),INDEX default_company_financial_year(financial_year_id),CONSTRAINT default_company_company_fk FOREIGN KEY (company_id) REFERENCES companies(id),CONSTRAINT default_company_financial_year_fk FOREIGN KEY (financial_year_id) REFERENCES financial_years(id)) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
    .execute(database);
}
