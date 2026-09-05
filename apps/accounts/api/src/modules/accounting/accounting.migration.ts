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

export const accountingCentralEntriesMigration = {
  key: "accounts.accounting.central-entries.v3",
  description:
    "Adds independent cash and bank source documents plus centralized immutable accounting entries."
};

export const accountingCoreLedgerLinksMigration = {
  key: "accounts.accounting.core-ledger-links.v4",
  description:
    "Links Core Common Ledger records to Accounts posting accounts for cash book vouchers."
};

export async function migrateAccountingCoreLedgerLinksModule<Database>(database: Kysely<Database>) {
  await sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS accounts_core_ledger_links (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      company_id INT NOT NULL,
      financial_year_id INT NOT NULL,
      core_ledger_id INT NOT NULL,
      account_id INT NOT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'active',
      created_by VARCHAR(191) NOT NULL DEFAULT 'system:migration',
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE KEY accounts_core_ledger_links_uuid_unique (uuid),
      UNIQUE KEY accounts_core_ledger_links_ledger_unique (company_id, financial_year_id, core_ledger_id),
      UNIQUE KEY accounts_core_ledger_links_account_unique (company_id, financial_year_id, account_id),
      INDEX accounts_core_ledger_links_account (account_id),
      CONSTRAINT accounts_core_ledger_links_account_fk FOREIGN KEY (account_id) REFERENCES accounts_accounts (id) ON DELETE RESTRICT
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `
    )
    .execute(database);
}

export const accountingCashBookLinesMigration = {
  key: "accounts.accounting.cash-book-lines.v5",
  description: "Adds multiple counterpart lines to independent cash book vouchers."
};

export const accountingTablePrefixMigration = {
  key: "accounts.accounting.table-prefix.v6",
  description: "Renames legacy acc_ tables to the Accounts-owned accounts_ prefix."
};

const legacyAccountsTableRenames = [
  ["acc_account_groups", "accounts_account_groups"],
  ["acc_accounts", "accounts_accounts"],
  ["acc_accounting_periods", "accounts_accounting_periods"],
  ["acc_accounting_rules", "accounts_accounting_rules"],
  ["acc_journal_entries", "accounts_journal_entries"],
  ["acc_journal_lines", "accounts_journal_lines"],
  ["acc_ledger", "accounts_ledger"],
  ["acc_entries", "accounts_entries"],
  ["acc_entry_lines", "accounts_entry_lines"],
  ["acc_cash_entries", "accounts_cash_entries"],
  ["acc_bank_entries", "accounts_bank_entries"],
  ["acc_core_ledger_links", "accounts_core_ledger_links"],
  ["acc_cash_entry_lines", "accounts_cash_entry_lines"]
] as const;

export async function migrateAccountingTablePrefixModule<Database>(database: Kysely<Database>) {
  const result = await sql<{ table_name: string }>`
    SELECT TABLE_NAME AS table_name
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'
  `.execute(database);
  const tables = new Set(result.rows.map((row) => row.table_name));
  const collisions = legacyAccountsTableRenames.filter(
    ([legacy, current]) => tables.has(legacy) && tables.has(current)
  );
  if (collisions.length > 0) {
    throw new Error(
      `Accounts table-prefix migration refused because both legacy and current tables exist: ${collisions
        .map(([legacy, current]) => `${legacy}/${current}`)
        .join(", ")}. Reconcile the data before retrying.`
    );
  }

  const renames = legacyAccountsTableRenames.filter(([legacy]) => tables.has(legacy));
  if (renames.length > 0) {
    await sql
      .raw(
        `RENAME TABLE ${renames.map(([legacy, current]) => `\`${legacy}\` TO \`${current}\``).join(", ")}`
      )
      .execute(database);
  }

  for (const tableName of [
    "accounts_accounting_periods",
    "accounts_bank_entries",
    "accounts_cash_entries",
    "accounts_entries",
    "accounts_journal_entries"
  ]) {
    if (!tables.has(tableName) && !renames.some(([, current]) => current === tableName)) continue;
    await sql
      .raw(
        `ALTER TABLE \`${tableName}\` MODIFY COLUMN status VARCHAR(24) NOT NULL DEFAULT '${
          tableName === "accounts_accounting_periods"
            ? "open"
            : tableName === "accounts_journal_entries"
              ? "draft"
              : "posted"
        }'`
      )
      .execute(database);
  }
}

export async function migrateAccountingCashBookLinesModule<Database>(database: Kysely<Database>) {
  await sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS accounts_cash_entry_lines (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      cash_entry_id INT NOT NULL,
      line_number INT NOT NULL,
      core_ledger_id INT NULL,
      account_id INT NOT NULL,
      amount DECIMAL(20,2) NOT NULL DEFAULT 0,
      status VARCHAR(24) NOT NULL DEFAULT 'active',
      created_by VARCHAR(191) NOT NULL DEFAULT 'system:migration',
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE KEY accounts_cash_entry_lines_uuid_unique (uuid),
      UNIQUE KEY accounts_cash_entry_lines_number_unique (cash_entry_id, line_number),
      INDEX accounts_cash_entry_lines_account (account_id),
      INDEX accounts_cash_entry_lines_core_ledger (core_ledger_id),
      CONSTRAINT accounts_cash_entry_lines_entry_fk FOREIGN KEY (cash_entry_id) REFERENCES accounts_cash_entries (id) ON DELETE RESTRICT,
      CONSTRAINT accounts_cash_entry_lines_account_fk FOREIGN KEY (account_id) REFERENCES accounts_accounts (id) ON DELETE RESTRICT
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `
    )
    .execute(database);

  await sql
    .raw(
      `
    INSERT IGNORE INTO accounts_cash_entry_lines
      (uuid, cash_entry_id, line_number, core_ledger_id, account_id, amount, created_by, created_at)
    SELECT LOWER(SUBSTRING(REPLACE(UUID(),'-',''),1,8)), source.id, 1,
           link.core_ledger_id, source.counterpart_account_id, source.amount,
           source.created_by, source.created_at
    FROM accounts_cash_entries source
    LEFT JOIN accounts_core_ledger_links link
      ON link.company_id=source.company_id
      AND link.financial_year_id=source.financial_year_id
      AND link.account_id=source.counterpart_account_id
  `
    )
    .execute(database);
}

export async function migrateAccountingBooksModule<Database>(database: Kysely<Database>) {
  await sql
    .raw(
      `
    ALTER TABLE accounts_accounts
      ADD COLUMN IF NOT EXISTS is_cash TINYINT(1) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS is_bank TINYINT(1) NOT NULL DEFAULT 0
  `
    )
    .execute(database);
}

export async function migrateAccountingCentralEntriesModule<Database>(database: Kysely<Database>) {
  await sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS accounts_entries (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      company_id INT NOT NULL,
      financial_year_id INT NOT NULL,
      accounting_period_id INT NULL,
      source_type ENUM('journal','cash-book','bank-book') NOT NULL,
      source_uuid CHAR(8) NOT NULL,
      entry_number VARCHAR(80) NOT NULL,
      entry_date DATE NOT NULL,
      reference VARCHAR(191) NULL,
      description TEXT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'posted',
      reversal_of_id INT NULL,
      posted_by VARCHAR(191) NOT NULL,
      posted_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      created_by VARCHAR(191) NOT NULL DEFAULT 'system:migration',
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE KEY accounts_entries_uuid_unique (uuid),
      UNIQUE KEY accounts_entries_source_unique (source_type, source_uuid),
      UNIQUE KEY accounts_entries_number_unique (company_id, financial_year_id, entry_number),
      INDEX accounts_entries_date (company_id, financial_year_id, entry_date),
      INDEX accounts_entries_period (accounting_period_id),
      INDEX accounts_entries_reversal (reversal_of_id),
      CONSTRAINT accounts_entries_period_fk FOREIGN KEY (accounting_period_id) REFERENCES accounts_accounting_periods (id) ON DELETE RESTRICT,
      CONSTRAINT accounts_entries_reversal_fk FOREIGN KEY (reversal_of_id) REFERENCES accounts_entries (id) ON DELETE RESTRICT
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `
    )
    .execute(database);

  await sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS accounts_entry_lines (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      entry_id INT NOT NULL,
      line_number INT NOT NULL,
      account_id INT NOT NULL,
      debit DECIMAL(20,2) NOT NULL DEFAULT 0,
      credit DECIMAL(20,2) NOT NULL DEFAULT 0,
      base_debit DECIMAL(20,2) NOT NULL DEFAULT 0,
      base_credit DECIMAL(20,2) NOT NULL DEFAULT 0,
      currency_code VARCHAR(8) NOT NULL DEFAULT 'INR',
      description VARCHAR(500) NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'active',
      created_by VARCHAR(191) NOT NULL DEFAULT 'system:migration',
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE KEY accounts_entry_lines_uuid_unique (uuid),
      UNIQUE KEY accounts_entry_lines_number_unique (entry_id, line_number),
      INDEX accounts_entry_lines_account (account_id),
      CONSTRAINT accounts_entry_lines_entry_fk FOREIGN KEY (entry_id) REFERENCES accounts_entries (id) ON DELETE RESTRICT,
      CONSTRAINT accounts_entry_lines_account_fk FOREIGN KEY (account_id) REFERENCES accounts_accounts (id) ON DELETE RESTRICT
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `
    )
    .execute(database);

  await createCashBookSourceTable(database);
  await createBankBookSourceTable(database);

  await sql
    .raw(
      `
    ALTER TABLE accounts_journal_entries
      ADD COLUMN IF NOT EXISTS source_type VARCHAR(24) NOT NULL DEFAULT 'journal',
      ADD COLUMN IF NOT EXISTS posted_entry_id INT NULL
  `
    )
    .execute(database);

  await sql
    .raw(
      `
    UPDATE accounts_journal_entries
    SET source_type = CASE
      WHEN entry_number LIKE 'CR-%' THEN 'cash-book'
      WHEN entry_number LIKE 'BR-%' THEN 'bank-book'
      ELSE 'journal'
    END
    WHERE source_type='journal' AND (entry_number LIKE 'CR-%' OR entry_number LIKE 'BR-%')
  `
    )
    .execute(database);

  await backfillCentralEntries(database);
}

async function createCashBookSourceTable<Database>(database: Kysely<Database>) {
  await sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS accounts_cash_entries (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      company_id INT NOT NULL,
      financial_year_id INT NOT NULL,
      line_number INT NOT NULL,
      entry_number VARCHAR(80) NOT NULL,
      entry_date DATE NOT NULL,
      entry_type ENUM('receipt','payment') NOT NULL,
      account_id INT NOT NULL,
      counterpart_account_id INT NOT NULL,
      amount DECIMAL(20,2) NOT NULL,
      reference VARCHAR(191) NULL,
      description VARCHAR(500) NOT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'posted',
      posted_entry_id INT NOT NULL,
      created_by VARCHAR(191) NOT NULL DEFAULT 'system:migration',
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE KEY accounts_cash_entries_uuid_unique (uuid),
      UNIQUE KEY accounts_cash_entries_number_unique (company_id, financial_year_id, entry_number),
      UNIQUE KEY accounts_cash_entries_line_unique (company_id, financial_year_id, line_number),
      UNIQUE KEY accounts_cash_entries_posted_unique (posted_entry_id),
      INDEX accounts_cash_entries_date (company_id, financial_year_id, entry_date),
      INDEX accounts_cash_entries_account (account_id),
      INDEX accounts_cash_entries_counterpart (counterpart_account_id),
      CONSTRAINT accounts_cash_entries_account_fk FOREIGN KEY (account_id) REFERENCES accounts_accounts (id) ON DELETE RESTRICT,
      CONSTRAINT accounts_cash_entries_counterpart_fk FOREIGN KEY (counterpart_account_id) REFERENCES accounts_accounts (id) ON DELETE RESTRICT,
      CONSTRAINT accounts_cash_entries_posted_fk FOREIGN KEY (posted_entry_id) REFERENCES accounts_entries (id) ON DELETE RESTRICT
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `
    )
    .execute(database);
}

async function createBankBookSourceTable<Database>(database: Kysely<Database>) {
  await sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS accounts_bank_entries (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      company_id INT NOT NULL,
      financial_year_id INT NOT NULL,
      line_number INT NOT NULL,
      entry_number VARCHAR(80) NOT NULL,
      entry_date DATE NOT NULL,
      entry_type ENUM('receipt','payment') NOT NULL,
      account_id INT NOT NULL,
      counterpart_account_id INT NOT NULL,
      amount DECIMAL(20,2) NOT NULL,
      reference VARCHAR(191) NULL,
      description VARCHAR(500) NOT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'posted',
      posted_entry_id INT NOT NULL,
      created_by VARCHAR(191) NOT NULL DEFAULT 'system:migration',
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE KEY accounts_bank_entries_uuid_unique (uuid),
      UNIQUE KEY accounts_bank_entries_number_unique (company_id, financial_year_id, entry_number),
      UNIQUE KEY accounts_bank_entries_line_unique (company_id, financial_year_id, line_number),
      UNIQUE KEY accounts_bank_entries_posted_unique (posted_entry_id),
      INDEX accounts_bank_entries_date (company_id, financial_year_id, entry_date),
      INDEX accounts_bank_entries_account (account_id),
      INDEX accounts_bank_entries_counterpart (counterpart_account_id),
      CONSTRAINT accounts_bank_entries_account_fk FOREIGN KEY (account_id) REFERENCES accounts_accounts (id) ON DELETE RESTRICT,
      CONSTRAINT accounts_bank_entries_counterpart_fk FOREIGN KEY (counterpart_account_id) REFERENCES accounts_accounts (id) ON DELETE RESTRICT,
      CONSTRAINT accounts_bank_entries_posted_fk FOREIGN KEY (posted_entry_id) REFERENCES accounts_entries (id) ON DELETE RESTRICT
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `
    )
    .execute(database);
}

async function backfillCentralEntries<Database>(database: Kysely<Database>) {
  await sql
    .raw(
      `
    INSERT IGNORE INTO accounts_entries
      (uuid, company_id, financial_year_id, accounting_period_id, source_type, source_uuid,
       entry_number, entry_date, reference, description, status, posted_by, posted_at, created_by, created_at)
    SELECT LOWER(SUBSTRING(REPLACE(UUID(),'-',''),1,8)), j.company_id, j.financial_year_id,
           j.accounting_period_id,
           CASE j.source_type WHEN 'cash-book' THEN 'cash-book' WHEN 'bank-book' THEN 'bank-book' ELSE 'journal' END,
           j.uuid, j.entry_number, j.entry_date, j.reference, j.description,
           CASE WHEN j.status='reversed' THEN 'reversed' ELSE 'posted' END,
           COALESCE(j.posted_by, 'system:migration'), COALESCE(j.posted_at, j.updated_at),
           COALESCE(j.created_by, 'system:migration'), j.created_at
    FROM accounts_journal_entries j
    WHERE j.status IN ('posted','reversed') AND j.deleted_at IS NULL
  `
    )
    .execute(database);

  await sql
    .raw(
      `
    INSERT IGNORE INTO accounts_entry_lines
      (uuid, entry_id, line_number, account_id, debit, credit, base_debit, base_credit,
       currency_code, description, created_by, created_at)
    SELECT LOWER(SUBSTRING(REPLACE(UUID(),'-',''),1,8)), e.id, l.line_number, l.account_id,
           l.debit, l.credit, l.base_debit, l.base_credit, l.currency_code, l.description,
           COALESCE(j.posted_by, j.created_by, 'system:migration'), l.created_at
    FROM accounts_journal_entries j
    INNER JOIN accounts_entries e ON e.source_type=CASE j.source_type
      WHEN 'cash-book' THEN 'cash-book' WHEN 'bank-book' THEN 'bank-book' ELSE 'journal' END
      AND e.source_uuid=j.uuid
    INNER JOIN accounts_journal_lines l ON l.journal_entry_id=j.id
    WHERE j.status IN ('posted','reversed') AND j.deleted_at IS NULL
  `
    )
    .execute(database);

  await sql
    .raw(
      `
    UPDATE accounts_journal_entries j
    INNER JOIN accounts_entries e ON e.source_type=CASE j.source_type
      WHEN 'cash-book' THEN 'cash-book' WHEN 'bank-book' THEN 'bank-book' ELSE 'journal' END
      AND e.source_uuid=j.uuid
    SET j.posted_entry_id=e.id
    WHERE j.posted_entry_id IS NULL
  `
    )
    .execute(database);

  await backfillBookSources(database, "cash-book", "accounts_cash_entries", "is_cash");
  await backfillBookSources(database, "bank-book", "accounts_bank_entries", "is_bank");
}

async function backfillBookSources<Database>(
  database: Kysely<Database>,
  sourceType: "cash-book" | "bank-book",
  tableName: "accounts_cash_entries" | "accounts_bank_entries",
  accountFlag: "is_cash" | "is_bank"
) {
  await sql
    .raw(
      `
    INSERT IGNORE INTO ${tableName}
      (uuid, company_id, financial_year_id, line_number, entry_number, entry_date, entry_type,
       account_id, counterpart_account_id, amount, reference, description, status, posted_entry_id,
       created_by, created_at)
    SELECT j.uuid, j.company_id, j.financial_year_id, j.line_number, j.entry_number, j.entry_date,
           CASE WHEN MAX(CASE WHEN a.${accountFlag}=1 THEN l.debit ELSE 0 END) > 0
             THEN 'receipt' ELSE 'payment' END,
           MAX(CASE WHEN a.${accountFlag}=1 THEN l.account_id END),
           MAX(CASE WHEN a.${accountFlag}=0 THEN l.account_id END),
           GREATEST(MAX(CASE WHEN a.${accountFlag}=1 THEN l.debit ELSE 0 END),
                    MAX(CASE WHEN a.${accountFlag}=1 THEN l.credit ELSE 0 END)),
           j.reference, COALESCE(j.description,''),
           CASE WHEN j.status='reversed' THEN 'reversed' ELSE 'posted' END,
           e.id, COALESCE(j.created_by,'system:migration'), j.created_at
    FROM accounts_journal_entries j
    INNER JOIN accounts_entries e ON e.source_type='${sourceType}' AND e.source_uuid=j.uuid
    INNER JOIN accounts_journal_lines l ON l.journal_entry_id=j.id
    INNER JOIN accounts_accounts a ON a.id=l.account_id
    WHERE j.source_type='${sourceType}'
    GROUP BY j.id, j.uuid, j.company_id, j.financial_year_id, j.line_number, j.entry_number,
             j.entry_date, j.reference, j.description, j.status, e.id, j.created_by, j.created_at
    HAVING MAX(CASE WHEN a.${accountFlag}=1 THEN l.account_id END) IS NOT NULL
       AND MAX(CASE WHEN a.${accountFlag}=0 THEN l.account_id END) IS NOT NULL
  `
    )
    .execute(database);
}

export async function migrateAccountingModule<Database>(database: Kysely<Database>) {
  await assertAccountingParentSchema(database);

  await sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS accounts_account_groups (
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
      UNIQUE KEY accounts_account_groups_uuid_unique (uuid),
      UNIQUE KEY accounts_account_groups_code_unique (company_id, financial_year_id, code),
      INDEX accounts_account_groups_parent (parent_id),
      INDEX accounts_account_groups_status (company_id, financial_year_id, status),
      CONSTRAINT accounts_account_groups_parent_fk FOREIGN KEY (parent_id) REFERENCES accounts_account_groups (id) ON DELETE RESTRICT
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `
    )
    .execute(database);

  await sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS accounts_accounts (
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
      UNIQUE KEY accounts_accounts_uuid_unique (uuid),
      UNIQUE KEY accounts_accounts_code_unique (company_id, financial_year_id, code),
      INDEX accounts_accounts_group (group_id),
      INDEX accounts_accounts_status (company_id, financial_year_id, status),
      INDEX accounts_accounts_type (account_type),
      CONSTRAINT accounts_accounts_group_fk FOREIGN KEY (group_id) REFERENCES accounts_account_groups (id) ON DELETE RESTRICT
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `
    )
    .execute(database);

  await sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS accounts_accounting_periods (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      company_id INT NOT NULL,
      financial_year_id INT NOT NULL,
      name VARCHAR(191) NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'open',
      is_system TINYINT(1) NOT NULL DEFAULT 0,
      created_by VARCHAR(191) NOT NULL DEFAULT 'system:migration',
      updated_by VARCHAR(191) NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE KEY accounts_accounting_periods_uuid_unique (uuid),
      UNIQUE KEY accounts_accounting_periods_name_unique (company_id, financial_year_id, name),
      INDEX accounts_accounting_periods_status (company_id, financial_year_id, status),
      INDEX accounts_accounting_periods_dates (company_id, financial_year_id, start_date, end_date)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `
    )
    .execute(database);

  await sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS accounts_journal_entries (
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
      status VARCHAR(24) NOT NULL DEFAULT 'draft',
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
      UNIQUE KEY accounts_journal_entries_uuid_unique (uuid),
      UNIQUE KEY accounts_journal_entries_entry_unique (company_id, financial_year_id, entry_number),
      UNIQUE KEY accounts_journal_entries_line_unique (company_id, financial_year_id, line_number),
      INDEX accounts_journal_entries_period (accounting_period_id),
      INDEX accounts_journal_entries_status (company_id, financial_year_id, status),
      INDEX accounts_journal_entries_date_status (entry_date, status),
      INDEX accounts_journal_entries_reversal (reversal_of_id),
      CONSTRAINT accounts_journal_entries_period_fk FOREIGN KEY (accounting_period_id) REFERENCES accounts_accounting_periods (id) ON DELETE RESTRICT,
      CONSTRAINT accounts_journal_entries_reversal_fk FOREIGN KEY (reversal_of_id) REFERENCES accounts_journal_entries (id) ON DELETE RESTRICT
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `
    )
    .execute(database);

  await sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS accounts_journal_lines (
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
      status VARCHAR(24) NOT NULL DEFAULT 'active',
      created_by VARCHAR(191) NOT NULL DEFAULT 'system:migration',
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE KEY accounts_journal_lines_uuid_unique (uuid),
      UNIQUE KEY accounts_journal_lines_line_unique (journal_entry_id, line_number),
      INDEX accounts_journal_lines_account (account_id),
      CONSTRAINT accounts_journal_lines_entry_fk FOREIGN KEY (journal_entry_id) REFERENCES accounts_journal_entries (id) ON DELETE CASCADE,
      CONSTRAINT accounts_journal_lines_account_fk FOREIGN KEY (account_id) REFERENCES accounts_accounts (id) ON DELETE RESTRICT
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `
    )
    .execute(database);

  await sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS accounts_ledger (
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
      status VARCHAR(24) NOT NULL DEFAULT 'active',
      created_by VARCHAR(191) NOT NULL DEFAULT 'system:migration',
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE KEY accounts_ledger_uuid_unique (uuid),
      UNIQUE KEY accounts_ledger_line_unique (journal_line_id),
      INDEX accounts_ledger_account_date (company_id, financial_year_id, account_id, entry_date),
      INDEX accounts_ledger_journal (journal_entry_id),
      CONSTRAINT accounts_ledger_account_fk FOREIGN KEY (account_id) REFERENCES accounts_accounts (id) ON DELETE RESTRICT,
      CONSTRAINT accounts_ledger_journal_fk FOREIGN KEY (journal_entry_id) REFERENCES accounts_journal_entries (id) ON DELETE RESTRICT,
      CONSTRAINT accounts_ledger_line_fk FOREIGN KEY (journal_line_id) REFERENCES accounts_journal_lines (id) ON DELETE RESTRICT
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `
    )
    .execute(database);

  await sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS accounts_accounting_rules (
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
      UNIQUE KEY accounts_accounting_rules_uuid_unique (uuid),
      INDEX accounts_accounting_rules_type (company_id, rule_type, is_active)
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
