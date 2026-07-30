import { sql, type Kysely } from "kysely";

export const quotationMigration = {
  key: "billing.quotation.relational-v2",
  description: "Module-owned relational quotations, line items, and activity history."
};

export async function migrateQuotationModule<Database>(database: Kysely<Database>) {
  await sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS billing_quotations (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      company_id INT NOT NULL,
      financial_year_id INT NOT NULL,
      line_number INT NOT NULL,
      quotation_number VARCHAR(80) NOT NULL,
      customer_id INT NOT NULL,
      billing_address_id INT NOT NULL,
      shipping_address_id INT NOT NULL,
      work_order_id INT NULL,
      ledger_id INT NULL,
      tax_type VARCHAR(24) NOT NULL DEFAULT 'cgst-sgst',
      currency_id INT NOT NULL,
      quotation_date DATE NOT NULL,
      subtotal DECIMAL(18,2) NOT NULL DEFAULT 0,
      tax_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
      round_off DECIMAL(18,2) NOT NULL DEFAULT 0,
      amount DECIMAL(18,2) NOT NULL DEFAULT 0,
      terms TEXT NULL,
      notes TEXT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'draft',
      generated_sales_invoice_no VARCHAR(120) NULL,
      created_by INT NULL,
      updated_by INT NULL,
      confirmed_by INT NULL,
      confirmed_at DATETIME(3) NULL,
      cancelled_by INT NULL,
      cancelled_at DATETIME(3) NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      deleted_at DATETIME(3) NULL,
      UNIQUE KEY billing_quotations_uuid_unique (uuid),
      UNIQUE KEY billing_quotations_number_unique (company_id, financial_year_id, quotation_number),
      UNIQUE KEY billing_quotations_line_unique (company_id, financial_year_id, line_number),
      INDEX billing_quotations_customer (customer_id),
      INDEX billing_quotations_work_order (work_order_id),
      INDEX billing_quotations_ledger (ledger_id),
      INDEX billing_quotations_date_status (quotation_date, status),
      CONSTRAINT billing_quotations_company_fk FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE RESTRICT,
      CONSTRAINT billing_quotations_financial_year_fk FOREIGN KEY (financial_year_id) REFERENCES financial_years (id) ON DELETE RESTRICT,
      CONSTRAINT billing_quotations_customer_fk FOREIGN KEY (customer_id) REFERENCES contacts (id) ON DELETE RESTRICT,
      CONSTRAINT billing_quotations_billing_address_fk FOREIGN KEY (billing_address_id) REFERENCES contacts_addresses (id) ON DELETE RESTRICT,
      CONSTRAINT billing_quotations_shipping_address_fk FOREIGN KEY (shipping_address_id) REFERENCES contacts_addresses (id) ON DELETE RESTRICT,
      CONSTRAINT billing_quotations_work_order_fk FOREIGN KEY (work_order_id) REFERENCES work_orders (id) ON DELETE RESTRICT,
      CONSTRAINT billing_quotations_ledger_fk FOREIGN KEY (ledger_id) REFERENCES ledgers (id) ON DELETE RESTRICT,
      CONSTRAINT billing_quotations_currency_fk FOREIGN KEY (currency_id) REFERENCES currencies (id) ON DELETE RESTRICT,
      CONSTRAINT billing_quotations_created_by_fk FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE RESTRICT,
      CONSTRAINT billing_quotations_updated_by_fk FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE RESTRICT,
      CONSTRAINT billing_quotations_confirmed_by_fk FOREIGN KEY (confirmed_by) REFERENCES users (id) ON DELETE RESTRICT,
      CONSTRAINT billing_quotations_cancelled_by_fk FOREIGN KEY (cancelled_by) REFERENCES users (id) ON DELETE RESTRICT
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `
    )
    .execute(database);

  await assertRelationalQuotationSchema(database);

  await sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS billing_quotation_items (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      quotation_id INT NOT NULL,
      line_number INT NOT NULL,
      product_id INT NULL,
      description TEXT NOT NULL,
      hsn_code_id INT NULL,
      po_no VARCHAR(120) NULL,
      dc_no VARCHAR(120) NULL,
      colour_id INT NULL,
      size_id INT NULL,
      quantity DECIMAL(18,4) NOT NULL,
      unit_id INT NOT NULL,
      rate DECIMAL(18,4) NOT NULL DEFAULT 0,
      tax_id INT NULL,
      tax_rate DECIMAL(7,4) NOT NULL DEFAULT 0,
      taxable_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
      cgst_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
      sgst_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
      igst_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
      tax_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
      line_total DECIMAL(18,2) NOT NULL DEFAULT 0,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE KEY billing_quotation_items_uuid_unique (uuid),
      UNIQUE KEY billing_quotation_items_line_unique (quotation_id, line_number),
      INDEX billing_quotation_items_product (product_id),
      INDEX billing_quotation_items_hsn (hsn_code_id),
      INDEX billing_quotation_items_tax (tax_id),
      CONSTRAINT billing_quotation_items_quotation_fk FOREIGN KEY (quotation_id) REFERENCES billing_quotations (id) ON DELETE RESTRICT,
      CONSTRAINT billing_quotation_items_product_fk FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE RESTRICT,
      CONSTRAINT billing_quotation_items_hsn_fk FOREIGN KEY (hsn_code_id) REFERENCES hsn_codes (id) ON DELETE RESTRICT,
      CONSTRAINT billing_quotation_items_colour_fk FOREIGN KEY (colour_id) REFERENCES colours (id) ON DELETE RESTRICT,
      CONSTRAINT billing_quotation_items_size_fk FOREIGN KEY (size_id) REFERENCES sizes (id) ON DELETE RESTRICT,
      CONSTRAINT billing_quotation_items_unit_fk FOREIGN KEY (unit_id) REFERENCES units (id) ON DELETE RESTRICT,
      CONSTRAINT billing_quotation_items_tax_fk FOREIGN KEY (tax_id) REFERENCES taxes (id) ON DELETE RESTRICT
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `
    )
    .execute(database);

  await sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS billing_quotation_activities (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      quotation_id INT NOT NULL,
      activity_type VARCHAR(80) NOT NULL,
      action VARCHAR(80) NOT NULL,
      description TEXT NOT NULL,
      previous_status VARCHAR(24) NULL,
      new_status VARCHAR(24) NULL,
      actor_user_id INT NULL,
      correlation_id VARCHAR(120) NULL,
      metadata_json JSON NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      UNIQUE KEY billing_quotation_activities_uuid_unique (uuid),
      INDEX billing_quotation_activities_created (quotation_id, created_at),
      CONSTRAINT billing_quotation_activities_quotation_fk FOREIGN KEY (quotation_id) REFERENCES billing_quotations (id) ON DELETE RESTRICT,
      CONSTRAINT billing_quotation_activities_actor_fk FOREIGN KEY (actor_user_id) REFERENCES users (id) ON DELETE RESTRICT
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `
    )
    .execute(database);
}

async function assertRelationalQuotationSchema<Database>(database: Kysely<Database>) {
  const result = await sql<{ data_type: string }>`
    SELECT DATA_TYPE AS data_type FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'billing_quotations' AND COLUMN_NAME = 'id'
  `.execute(database);
  if (result.rows[0]?.data_type.toLowerCase() !== "int") {
    throw new Error(
      "billing_quotations uses the legacy string-key schema. Apply a fresh or explicit forward data migration before starting Billing API."
    );
  }
}
