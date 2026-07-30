import { sql, type Kysely } from "kysely";

export const purchaseMigration = {
  key: "billing.purchase.relational-v2",
  description: "Module-owned relational purchases, line items, and activity history."
};

export async function migratePurchaseModule<Database>(database: Kysely<Database>) {
  await sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS billing_purchases (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      company_id INT NOT NULL,
      financial_year_id INT NOT NULL,
      line_number INT NOT NULL,
      purchase_number VARCHAR(80) NOT NULL,
      supplier_id INT NOT NULL,
      supplier_bill_number VARCHAR(120) NULL,
      supplier_bill_date DATE NULL,
      billing_address_id INT NOT NULL,
      shipping_address_id INT NOT NULL,
      work_order_id INT NULL,
      ledger_id INT NULL,
      tax_type VARCHAR(24) NOT NULL DEFAULT 'cgst-sgst',
      currency_id INT NOT NULL,
      purchase_date DATE NOT NULL,
      subtotal DECIMAL(18,2) NOT NULL DEFAULT 0,
      tax_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
      round_off DECIMAL(18,2) NOT NULL DEFAULT 0,
      amount DECIMAL(18,2) NOT NULL DEFAULT 0,
      terms TEXT NULL,
      notes TEXT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'draft',
      generated_sales_invoice_no VARCHAR(120) NULL,
      purchase_eway_json JSON NULL,
      purchase_einvoice_json JSON NULL,
      created_by INT NULL,
      updated_by INT NULL,
      confirmed_by INT NULL,
      confirmed_at DATETIME(3) NULL,
      cancelled_by INT NULL,
      cancelled_at DATETIME(3) NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      deleted_at DATETIME(3) NULL,
      UNIQUE KEY billing_purchases_uuid_unique (uuid),
      UNIQUE KEY billing_purchases_number_unique (company_id, financial_year_id, purchase_number),
      UNIQUE KEY billing_purchases_line_unique (company_id, financial_year_id, line_number),
      INDEX billing_purchases_supplier (supplier_id),
      INDEX billing_purchases_work_order (work_order_id),
      INDEX billing_purchases_ledger (ledger_id),
      INDEX billing_purchases_date_status (purchase_date, status),
      CONSTRAINT billing_purchases_company_fk FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE RESTRICT,
      CONSTRAINT billing_purchases_financial_year_fk FOREIGN KEY (financial_year_id) REFERENCES financial_years (id) ON DELETE RESTRICT,
      CONSTRAINT billing_purchases_supplier_fk FOREIGN KEY (supplier_id) REFERENCES contacts (id) ON DELETE RESTRICT,
      CONSTRAINT billing_purchases_billing_address_fk FOREIGN KEY (billing_address_id) REFERENCES contacts_addresses (id) ON DELETE RESTRICT,
      CONSTRAINT billing_purchases_shipping_address_fk FOREIGN KEY (shipping_address_id) REFERENCES contacts_addresses (id) ON DELETE RESTRICT,
      CONSTRAINT billing_purchases_work_order_fk FOREIGN KEY (work_order_id) REFERENCES work_orders (id) ON DELETE RESTRICT,
      CONSTRAINT billing_purchases_ledger_fk FOREIGN KEY (ledger_id) REFERENCES ledgers (id) ON DELETE RESTRICT,
      CONSTRAINT billing_purchases_currency_fk FOREIGN KEY (currency_id) REFERENCES currencies (id) ON DELETE RESTRICT,
      CONSTRAINT billing_purchases_created_by_fk FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE RESTRICT,
      CONSTRAINT billing_purchases_updated_by_fk FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE RESTRICT,
      CONSTRAINT billing_purchases_confirmed_by_fk FOREIGN KEY (confirmed_by) REFERENCES users (id) ON DELETE RESTRICT,
      CONSTRAINT billing_purchases_cancelled_by_fk FOREIGN KEY (cancelled_by) REFERENCES users (id) ON DELETE RESTRICT
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `
    )
    .execute(database);

  await ensurePurchaseHeaderColumns(database);
  await assertRelationalPurchaseSchema(database);

  await sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS billing_purchase_items (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      purchase_id INT NOT NULL,
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
      UNIQUE KEY billing_purchase_items_uuid_unique (uuid),
      UNIQUE KEY billing_purchase_items_line_unique (purchase_id, line_number),
      INDEX billing_purchase_items_product (product_id),
      INDEX billing_purchase_items_hsn (hsn_code_id),
      INDEX billing_purchase_items_tax (tax_id),
      CONSTRAINT billing_purchase_items_purchase_fk FOREIGN KEY (purchase_id) REFERENCES billing_purchases (id) ON DELETE RESTRICT,
      CONSTRAINT billing_purchase_items_product_fk FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE RESTRICT,
      CONSTRAINT billing_purchase_items_hsn_fk FOREIGN KEY (hsn_code_id) REFERENCES hsn_codes (id) ON DELETE RESTRICT,
      CONSTRAINT billing_purchase_items_colour_fk FOREIGN KEY (colour_id) REFERENCES colours (id) ON DELETE RESTRICT,
      CONSTRAINT billing_purchase_items_size_fk FOREIGN KEY (size_id) REFERENCES sizes (id) ON DELETE RESTRICT,
      CONSTRAINT billing_purchase_items_unit_fk FOREIGN KEY (unit_id) REFERENCES units (id) ON DELETE RESTRICT,
      CONSTRAINT billing_purchase_items_tax_fk FOREIGN KEY (tax_id) REFERENCES taxes (id) ON DELETE RESTRICT
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `
    )
    .execute(database);

  await sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS billing_purchase_activities (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      purchase_id INT NOT NULL,
      activity_type VARCHAR(80) NOT NULL,
      action VARCHAR(80) NOT NULL,
      description TEXT NOT NULL,
      previous_status VARCHAR(24) NULL,
      new_status VARCHAR(24) NULL,
      actor_user_id INT NULL,
      correlation_id VARCHAR(120) NULL,
      metadata_json JSON NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      UNIQUE KEY billing_purchase_activities_uuid_unique (uuid),
      INDEX billing_purchase_activities_created (purchase_id, created_at),
      CONSTRAINT billing_purchase_activities_purchase_fk FOREIGN KEY (purchase_id) REFERENCES billing_purchases (id) ON DELETE RESTRICT,
      CONSTRAINT billing_purchase_activities_actor_fk FOREIGN KEY (actor_user_id) REFERENCES users (id) ON DELETE RESTRICT
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `
    )
    .execute(database);
}

async function ensurePurchaseHeaderColumns<Database>(database: Kysely<Database>) {
  const result = await sql<{ column_name: string }>`
    SELECT COLUMN_NAME AS column_name FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'billing_purchases'
      AND COLUMN_NAME IN ('supplier_bill_number', 'supplier_bill_date', 'purchase_eway_json', 'purchase_einvoice_json')
  `.execute(database);
  const columns = new Set(result.rows.map((row) => row.column_name));
  if (!columns.has("supplier_bill_number")) {
    await sql
      .raw(
        "ALTER TABLE billing_purchases ADD COLUMN supplier_bill_number VARCHAR(120) NULL AFTER supplier_id"
      )
      .execute(database);
  }
  if (!columns.has("supplier_bill_date")) {
    await sql
      .raw(
        "ALTER TABLE billing_purchases ADD COLUMN supplier_bill_date DATE NULL AFTER supplier_bill_number"
      )
      .execute(database);
  }
  if (!columns.has("purchase_eway_json")) {
    await sql
      .raw(
        "ALTER TABLE billing_purchases ADD COLUMN purchase_eway_json JSON NULL AFTER generated_sales_invoice_no"
      )
      .execute(database);
  }
  if (!columns.has("purchase_einvoice_json")) {
    await sql
      .raw(
        "ALTER TABLE billing_purchases ADD COLUMN purchase_einvoice_json JSON NULL AFTER purchase_eway_json"
      )
      .execute(database);
  }
}

async function assertRelationalPurchaseSchema<Database>(database: Kysely<Database>) {
  const result = await sql<{ data_type: string }>`
    SELECT DATA_TYPE AS data_type FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'billing_purchases' AND COLUMN_NAME = 'id'
  `.execute(database);
  if (result.rows[0]?.data_type.toLowerCase() !== "int") {
    throw new Error(
      "billing_purchases uses the legacy string-key schema. Apply a fresh or explicit forward data migration before starting Billing API."
    );
  }
}
