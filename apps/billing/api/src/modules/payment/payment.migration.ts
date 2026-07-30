import { sql, type Kysely } from "kysely";

export const paymentMigration = {
  key: "billing.payment.relational-v2",
  description: "Payment vouchers with module-owned allocations and activity history."
};

export async function migratePaymentModule<Database>(database: Kysely<Database>) {
  await assertPaymentParentSchema(database);
  await sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS billing_payments (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      company_id INT NOT NULL,
      financial_year_id INT NOT NULL,
      currency_id INT NOT NULL,
      line_number INT NOT NULL,
      payment_number VARCHAR(80) NOT NULL,
      payment_date DATE NOT NULL,
      supplier_id INT NOT NULL,
      payment_mode VARCHAR(24) NOT NULL DEFAULT 'cash',
      ledger_id INT NOT NULL,
      reference_no VARCHAR(120) NULL,
      reference_date DATE NULL,
      amount DECIMAL(18,2) NOT NULL DEFAULT 0,
      tds_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
      discount_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
      round_off DECIMAL(18,2) NOT NULL DEFAULT 0,
      total_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
      allocated_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
      unallocated_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
      status VARCHAR(24) NOT NULL DEFAULT 'draft',
      notes TEXT NULL,
      posted_by INT NULL,
      posted_at DATETIME(3) NULL,
      cancelled_by INT NULL,
      cancelled_at DATETIME(3) NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      deleted_at DATETIME(3) NULL,
      UNIQUE KEY billing_payments_uuid_unique (uuid),
      UNIQUE KEY billing_payments_number_unique (company_id, financial_year_id, payment_number),
      UNIQUE KEY billing_payments_line_unique (company_id, financial_year_id, line_number),
      INDEX billing_payments_supplier (supplier_id),
      INDEX billing_payments_date_status (payment_date, status),
      CONSTRAINT billing_payments_company_fk FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE RESTRICT,
      CONSTRAINT billing_payments_financial_year_fk FOREIGN KEY (financial_year_id) REFERENCES financial_years (id) ON DELETE RESTRICT,
      CONSTRAINT billing_payments_currency_fk FOREIGN KEY (currency_id) REFERENCES currencies (id) ON DELETE RESTRICT,
      CONSTRAINT billing_payments_supplier_fk FOREIGN KEY (supplier_id) REFERENCES contacts (id) ON DELETE RESTRICT,
      CONSTRAINT billing_payments_ledger_fk FOREIGN KEY (ledger_id) REFERENCES ledgers (id) ON DELETE RESTRICT,
      CONSTRAINT billing_payments_posted_by_fk FOREIGN KEY (posted_by) REFERENCES users (id) ON DELETE RESTRICT,
      CONSTRAINT billing_payments_cancelled_by_fk FOREIGN KEY (cancelled_by) REFERENCES users (id) ON DELETE RESTRICT
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `
    )
    .execute(database);
  await assertRelationalPaymentSchema(database);
  await sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS billing_payment_allocations (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      payment_id INT NOT NULL,
      purchase_id INT NOT NULL,
      line_number INT NOT NULL,
      allocated_amount DECIMAL(18,2) NOT NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE KEY billing_payment_allocations_uuid_unique (uuid),
      UNIQUE KEY billing_payment_allocations_purchase_unique (payment_id, purchase_id),
      UNIQUE KEY billing_payment_allocations_line_unique (payment_id, line_number),
      INDEX billing_payment_allocations_purchase (purchase_id),
      CONSTRAINT billing_payment_allocations_payment_fk FOREIGN KEY (payment_id) REFERENCES billing_payments (id) ON DELETE RESTRICT,
      CONSTRAINT billing_payment_allocations_purchase_fk FOREIGN KEY (purchase_id) REFERENCES billing_purchases (id) ON DELETE RESTRICT
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `
    )
    .execute(database);
  await sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS billing_payment_activities (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      payment_id INT NOT NULL,
      action VARCHAR(80) NOT NULL,
      description TEXT NOT NULL,
      previous_status VARCHAR(24) NULL,
      new_status VARCHAR(24) NULL,
      correlation_id VARCHAR(120) NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      UNIQUE KEY billing_payment_activities_uuid_unique (uuid),
      INDEX billing_payment_activities_payment_created (payment_id, created_at),
      CONSTRAINT billing_payment_activities_payment_fk FOREIGN KEY (payment_id) REFERENCES billing_payments (id) ON DELETE RESTRICT
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `
    )
    .execute(database);
}

async function assertPaymentParentSchema<Database>(database: Kysely<Database>) {
  const required = [
    "companies",
    "financial_years",
    "currencies",
    "contacts",
    "ledgers",
    "users",
    "billing_purchases"
  ];
  const result = await sql<{ table_name: string }>`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name IN (${sql.join(required)})
  `.execute(database);
  const found = new Set(result.rows.map((row) => row.table_name));
  const missing = required.filter((table) => !found.has(table));
  if (missing.length)
    throw new Error(`Payment migration requires parent tables: ${missing.join(", ")}.`);
}

async function assertRelationalPaymentSchema<Database>(database: Kysely<Database>) {
  const result = await sql<{ column_name: string; data_type: string }>`
    SELECT column_name, data_type FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'billing_payments'
  `.execute(database);
  const columns = new Map(result.rows.map((row) => [row.column_name, row.data_type]));
  if (columns.get("id") !== "int" || !columns.has("uuid") || !columns.has("supplier_id")) {
    throw new Error(
      "Existing billing_payments uses the legacy schema. Run a forward data migration or recreate the tenant database before starting Billing."
    );
  }
}
