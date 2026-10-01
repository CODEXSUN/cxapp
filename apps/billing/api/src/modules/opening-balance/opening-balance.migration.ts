import { sql, type Kysely } from "kysely";

export const openingBalanceMigration = {
  key: "billing.opening-balances-v1",
  description: "Scoped party openings and explicit legacy assignment with audit history."
};

export async function migrateOpeningBalances<Database>(database: Kysely<Database>) {
  await sql
    .raw(
      `CREATE TABLE IF NOT EXISTS billing_opening_balances (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(8) NOT NULL UNIQUE,
    company_id INT NOT NULL, financial_year_id INT NOT NULL, contact_id INT NOT NULL,
    currency_id INT NOT NULL, party_role VARCHAR(24) NOT NULL,
    amount DECIMAL(18,2) NOT NULL, reason TEXT NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'active', created_by VARCHAR(191) NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE KEY billing_opening_balances_scope (company_id,financial_year_id,contact_id,party_role),
    FOREIGN KEY (company_id) REFERENCES core_companies(id) ON DELETE RESTRICT,
    FOREIGN KEY (financial_year_id) REFERENCES core_financial_years(id) ON DELETE RESTRICT,
    FOREIGN KEY (contact_id) REFERENCES core_contacts(id) ON DELETE RESTRICT,
    FOREIGN KEY (currency_id) REFERENCES core_currencies(id) ON DELETE RESTRICT
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
    .execute(database);
  await sql
    .raw(
      `CREATE TABLE IF NOT EXISTS billing_opening_balance_activities (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(8) NOT NULL UNIQUE,
    opening_balance_id INT NOT NULL, previous_amount DECIMAL(18,2) NULL,
    amount DECIMAL(18,2) NOT NULL, reason TEXT NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'active', created_by VARCHAR(191) NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    FOREIGN KEY (opening_balance_id) REFERENCES billing_opening_balances(id) ON DELETE RESTRICT
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
    .execute(database);
  await sql
    .raw(
      `CREATE TABLE IF NOT EXISTS billing_opening_balance_legacy_assignments (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(8) NOT NULL UNIQUE,
    opening_balance_id INT NOT NULL, contact_id INT NOT NULL, party_role VARCHAR(24) NOT NULL,
    legacy_amount DECIMAL(18,2) NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'active', created_by VARCHAR(191) NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE KEY billing_opening_balance_legacy_assignment (contact_id,party_role),
    FOREIGN KEY (opening_balance_id) REFERENCES billing_opening_balances(id) ON DELETE RESTRICT,
    FOREIGN KEY (contact_id) REFERENCES core_contacts(id) ON DELETE RESTRICT
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
    .execute(database);
}
