import { sql, type Kysely } from "kysely";

export const accountingMigration = {
  key: "accounts.accounting.v1",
  description:
    "Chart of accounts, journal entries with double-entry lines, ledger, accounting periods, and accounting rules."
};

export const accountingBooksMigration = {
  key: "accounts.accounting.books.v2",
  description: "Adds cash and bank book account classification to the chart of accounts."
};

export async function migrateAccountingBooksModule<Database>(database: Kysely<Database>) {
  await sql
    .raw(
      `
    ALTER TABLE acc_accounts
      ADD COLUMN IF NOT EXISTS is_cash TINYINT(1) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS is_bank TINYINT(1) NOT NULL DEFAULT 0
  `
    )
    .execute(database);
}

export async function migrateAccountingModule<Database>(database: Kysely<Database>) {
  await assertAccountingParentSchema(database);

  await sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS acc_account_groups (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      company_id INT NOT NULL,
      financial_year_id INT NOT NULL,
      parent_id INT NULL,
      code VARCHAR(40) NOT NULL,
      name VARCHAR(191) NOT NULL,
      normal_balance ENUM('debit','credit') NOT NULL DEFAULT 'debit',
      is_system TINYINT(1) NOT NULL DEFAULT 0,
      status VARCHAR(24) NOT NULL DEFAULT 'active',
      created_by VARCHAR(191) NOT NULL DEFAULT 'system:migration',
      updated_by VARCHAR(191) NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      deleted_at DATETIME(3) NULL,
      UNIQUE KEY acc_account_groups_uuid_unique (uuid),
      UNIQUE KEY acc_account_groups_code_unique (company_id, financial_year_id, code),
      INDEX acc_account_groups_parent (parent_id),
      INDEX acc_account_groups_status (company_id, financial_year_id, status),
      CONSTRAINT acc_account_groups_parent_fk FOREIGN KEY (parent_id) REFERENCES acc_account_groups (id) ON DELETE RESTRICT
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `
    )
    .execute(database);

  await sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS acc_accounts (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      company_id INT NOT NULL,
      financial_year_id INT NOT NULL,
      group_id INT NULL,
      code VARCHAR(40) NOT NULL,
      name VARCHAR(191) NOT NULL,
      account_type ENUM('asset','liability','equity','income','expense') NOT NULL,
      normal_balance ENUM('debit','credit') NOT NULL DEFAULT 'debit',
      is_group TINYINT(1) NOT NULL DEFAULT 0,
      is_system TINYINT(1) NOT NULL DEFAULT 0,
      is_postable TINYINT(1) NOT NULL DEFAULT 1,
      opening_balance DECIMAL(20,2) NOT NULL DEFAULT 0,
      currency_code VARCHAR(8) NOT NULL DEFAULT 'INR',
      description VARCHAR(500) NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'active',
      created_by VARCHAR(191) NOT NULL DEFAULT 'system:migration',
      updated_by VARCHAR(191) NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      deleted_at DATETIME(3) NULL,
      UNIQUE KEY acc_accounts_uuid_unique (uuid),
      UNIQUE KEY acc_accounts_code_unique (company_id, financial_year_id, code),
      INDEX acc_accounts_group (group_id),
      INDEX acc_accounts_status (company_id, financial_year_id, status),
      INDEX acc_accounts_type (account_type),
      CONSTRAINT acc_accounts_group_fk FOREIGN KEY (group_id) REFERENCES acc_account_groups (id) ON DELETE RESTRICT
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `
    )
    .execute(database);

  await sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS acc_accounting_periods (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      company_id INT NOT NULL,
      financial_year_id INT NOT NULL,
      name VARCHAR(191) NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      status ENUM('open','closed','locked') NOT NULL DEFAULT 'open',
      is_system TINYINT(1) NOT NULL DEFAULT 0,
      created_by VARCHAR(191) NOT NULL DEFAULT 'system:migration',
      updated_by VARCHAR(191) NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE KEY acc_accounting_periods_uuid_unique (uuid),
      UNIQUE KEY acc_accounting_periods_name_unique (company_id, financial_year_id, name),
      INDEX acc_accounting_periods_status (company_id, financial_year_id, status),
      INDEX acc_accounting_periods_dates (company_id, financial_year_id, start_date, end_date)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `
    )
    .execute(database);

  await sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS acc_journal_entries (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      company_id INT NOT NULL,
      financial_year_id INT NOT NULL,
      accounting_period_id INT NULL,
      line_number INT NOT NULL,
      entry_number VARCHAR(80) NOT NULL,
      entry_date DATE NOT NULL,
      reference VARCHAR(191) NULL,
      description TEXT NULL,
      status ENUM('draft','ready_to_post','posted','cancelled','reversed') NOT NULL DEFAULT 'draft',
      posted_by VARCHAR(191) NULL,
      posted_at DATETIME(3) NULL,
      reversed_by VARCHAR(191) NULL,
      reversed_at DATETIME(3) NULL,
      reversal_of_id INT NULL,
      cancellation_reason VARCHAR(500) NULL,
      created_by VARCHAR(191) NOT NULL DEFAULT 'system:migration',
      updated_by VARCHAR(191) NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      deleted_at DATETIME(3) NULL,
      UNIQUE KEY acc_journal_entries_uuid_unique (uuid),
      UNIQUE KEY acc_journal_entries_entry_unique (company_id, financial_year_id, entry_number),
      UNIQUE KEY acc_journal_entries_line_unique (company_id, financial_year_id, line_number),
      INDEX acc_journal_entries_period (accounting_period_id),
      INDEX acc_journal_entries_status (company_id, financial_year_id, status),
      INDEX acc_journal_entries_date_status (entry_date, status),
      INDEX acc_journal_entries_reversal (reversal_of_id),
      CONSTRAINT acc_journal_entries_period_fk FOREIGN KEY (accounting_period_id) REFERENCES acc_accounting_periods (id) ON DELETE RESTRICT,
      CONSTRAINT acc_journal_entries_reversal_fk FOREIGN KEY (reversal_of_id) REFERENCES acc_journal_entries (id) ON DELETE RESTRICT
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `
    )
    .execute(database);

  await sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS acc_journal_lines (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      journal_entry_id INT NOT NULL,
      line_number INT NOT NULL,
      account_id INT NOT NULL,
      debit DECIMAL(20,2) NOT NULL DEFAULT 0,
      credit DECIMAL(20,2) NOT NULL DEFAULT 0,
      base_debit DECIMAL(20,2) NOT NULL DEFAULT 0,
      base_credit DECIMAL(20,2) NOT NULL DEFAULT 0,
      currency_code VARCHAR(8) NOT NULL DEFAULT 'INR',
      description VARCHAR(500) NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE KEY acc_journal_lines_uuid_unique (uuid),
      UNIQUE KEY acc_journal_lines_line_unique (journal_entry_id, line_number),
      INDEX acc_journal_lines_account (account_id),
      CONSTRAINT acc_journal_lines_entry_fk FOREIGN KEY (journal_entry_id) REFERENCES acc_journal_entries (id) ON DELETE CASCADE,
      CONSTRAINT acc_journal_lines_account_fk FOREIGN KEY (account_id) REFERENCES acc_accounts (id) ON DELETE RESTRICT
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `
    )
    .execute(database);

  await sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS acc_ledger (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      company_id INT NOT NULL,
      financial_year_id INT NOT NULL,
      account_id INT NOT NULL,
      journal_entry_id INT NOT NULL,
      journal_line_id INT NOT NULL,
      entry_date DATE NOT NULL,
      debit DECIMAL(20,2) NOT NULL DEFAULT 0,
      credit DECIMAL(20,2) NOT NULL DEFAULT 0,
      created_by VARCHAR(191) NOT NULL DEFAULT 'system:migration',
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      UNIQUE KEY acc_ledger_uuid_unique (uuid),
      UNIQUE KEY acc_ledger_line_unique (journal_line_id),
      INDEX acc_ledger_account_date (company_id, financial_year_id, account_id, entry_date),
      INDEX acc_ledger_journal (journal_entry_id),
      CONSTRAINT acc_ledger_account_fk FOREIGN KEY (account_id) REFERENCES acc_accounts (id) ON DELETE RESTRICT,
      CONSTRAINT acc_ledger_journal_fk FOREIGN KEY (journal_entry_id) REFERENCES acc_journal_entries (id) ON DELETE RESTRICT,
      CONSTRAINT acc_ledger_line_fk FOREIGN KEY (journal_line_id) REFERENCES acc_journal_lines (id) ON DELETE RESTRICT
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `
    )
    .execute(database);

  await sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS acc_accounting_rules (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      company_id INT NOT NULL,
      rule_type VARCHAR(80) NOT NULL,
      name VARCHAR(191) NOT NULL,
      description VARCHAR(500) NULL,
      config_json JSON NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      status VARCHAR(24) NOT NULL DEFAULT 'active',
      created_by VARCHAR(191) NOT NULL DEFAULT 'system:migration',
      updated_by VARCHAR(191) NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE KEY acc_accounting_rules_uuid_unique (uuid),
      INDEX acc_accounting_rules_type (company_id, rule_type, is_active)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `
    )
    .execute(database);
}

const accountingParentTables = ["core_companies", "core_financial_years"] as const;

export async function assertAccountingParentSchema<Database>(database: Kysely<Database>) {
  const result = await sql<{ table_name: string }>`
    SELECT tables.TABLE_NAME AS table_name
    FROM information_schema.TABLES AS tables
    WHERE tables.TABLE_SCHEMA = DATABASE()
      AND tables.TABLE_NAME IN ('core_companies', 'core_financial_years')
  `.execute(database);

  const parents = new Set(result.rows.map((row) => row.table_name));
  const missing = accountingParentTables.filter((tableName) => !parents.has(tableName));
  if (missing.length === 0) return;

  throw new Error(
    `Accounting migration requires Core-owned parent schemas before Accounts starts (missing tables: ${missing.join(
      ", "
    )}). Start and finish Core API database bootstrap first.`
  );
}
