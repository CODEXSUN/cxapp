import { sql, type Kysely } from "kysely";

export const exportSalesMigration = {
  key: "billing.export-sales.relational-v2",
  description:
    "Export Sales invoices with module-owned items, compliance, collaboration, and entry-tool tables."
};

export async function migrateExportSalesModule<Database>(database: Kysely<Database>) {
  await assertExportSalesParentSchema(database);

  await sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS billing_export_sales (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      company_id INT NOT NULL,
      financial_year_id INT NOT NULL,
      line_number INT NOT NULL,
      invoice_number VARCHAR(80) NOT NULL,
      customer_id INT NOT NULL,
      billing_address_id INT NOT NULL,
      shipping_address_id INT NOT NULL,
      work_order_id INT NULL,
      ledger_id INT NULL,
      tax_type VARCHAR(24) NOT NULL DEFAULT 'cgst-sgst',
      currency_id INT NOT NULL,
      issued_on DATE NOT NULL,
      subtotal DECIMAL(18,2) NOT NULL DEFAULT 0,
      tax_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
      round_off DECIMAL(18,2) NOT NULL DEFAULT 0,
      amount DECIMAL(18,2) NOT NULL DEFAULT 0,
      terms TEXT NULL,
      notes TEXT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'draft',
      created_by INT NULL,
      updated_by INT NULL,
      confirmed_by INT NULL,
      confirmed_at DATETIME(3) NULL,
      cancelled_by INT NULL,
      cancelled_at DATETIME(3) NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      deleted_at DATETIME(3) NULL,
      UNIQUE KEY billing_export_sales_uuid_unique (uuid),
      UNIQUE KEY billing_export_sales_invoice_unique (company_id, financial_year_id, invoice_number),
      UNIQUE KEY billing_export_sales_line_unique (company_id, financial_year_id, line_number),
      INDEX billing_export_sales_customer (customer_id),
      INDEX billing_export_sales_work_order (work_order_id),
      INDEX billing_export_sales_ledger (ledger_id),
      INDEX billing_export_sales_issued_status (issued_on, status),
      CONSTRAINT billing_export_sales_company_fk FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE RESTRICT,
      CONSTRAINT billing_export_sales_financial_year_fk FOREIGN KEY (financial_year_id) REFERENCES financial_years (id) ON DELETE RESTRICT,
      CONSTRAINT billing_export_sales_customer_fk FOREIGN KEY (customer_id) REFERENCES contacts (id) ON DELETE RESTRICT,
      CONSTRAINT billing_export_sales_billing_address_fk FOREIGN KEY (billing_address_id) REFERENCES contacts_addresses (id) ON DELETE RESTRICT,
      CONSTRAINT billing_export_sales_shipping_address_fk FOREIGN KEY (shipping_address_id) REFERENCES contacts_addresses (id) ON DELETE RESTRICT,
      CONSTRAINT billing_export_sales_work_order_fk FOREIGN KEY (work_order_id) REFERENCES work_orders (id) ON DELETE RESTRICT,
      CONSTRAINT billing_export_sales_ledger_fk FOREIGN KEY (ledger_id) REFERENCES ledgers (id) ON DELETE RESTRICT,
      CONSTRAINT billing_export_sales_currency_fk FOREIGN KEY (currency_id) REFERENCES currencies (id) ON DELETE RESTRICT,
      CONSTRAINT billing_export_sales_created_by_fk FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE RESTRICT,
      CONSTRAINT billing_export_sales_updated_by_fk FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE RESTRICT,
      CONSTRAINT billing_export_sales_confirmed_by_fk FOREIGN KEY (confirmed_by) REFERENCES users (id) ON DELETE RESTRICT,
      CONSTRAINT billing_export_sales_cancelled_by_fk FOREIGN KEY (cancelled_by) REFERENCES users (id) ON DELETE RESTRICT
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `
    )
    .execute(database);

  await assertRelationalExportSalesSchema(database);

  await sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS billing_export_sales_items (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      export_sale_id INT NOT NULL,
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
      UNIQUE KEY billing_export_sales_items_uuid_unique (uuid),
      UNIQUE KEY billing_export_sales_items_line_unique (export_sale_id, line_number),
      INDEX billing_export_sales_items_product (product_id),
      INDEX billing_export_sales_items_hsn (hsn_code_id),
      INDEX billing_export_sales_items_tax (tax_id),
      CONSTRAINT billing_export_sales_items_exportSales_fk FOREIGN KEY (export_sale_id) REFERENCES billing_export_sales (id) ON DELETE RESTRICT,
      CONSTRAINT billing_export_sales_items_product_fk FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE RESTRICT,
      CONSTRAINT billing_export_sales_items_hsn_fk FOREIGN KEY (hsn_code_id) REFERENCES hsn_codes (id) ON DELETE RESTRICT,
      CONSTRAINT billing_export_sales_items_colour_fk FOREIGN KEY (colour_id) REFERENCES colours (id) ON DELETE RESTRICT,
      CONSTRAINT billing_export_sales_items_size_fk FOREIGN KEY (size_id) REFERENCES sizes (id) ON DELETE RESTRICT,
      CONSTRAINT billing_export_sales_items_unit_fk FOREIGN KEY (unit_id) REFERENCES units (id) ON DELETE RESTRICT,
      CONSTRAINT billing_export_sales_items_tax_fk FOREIGN KEY (tax_id) REFERENCES taxes (id) ON DELETE RESTRICT
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `
    )
    .execute(database);

  await sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS billing_export_sales_eway_bills (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      export_sale_id INT NOT NULL,
      bill_number VARCHAR(80) NOT NULL,
      bill_date DATE NOT NULL,
      part VARCHAR(16) NOT NULL DEFAULT 'Part B',
      transport_id INT NULL,
      vehicle_number VARCHAR(80) NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'not-generated',
      request_json JSON NULL,
      response_json JSON NULL,
      notes TEXT NULL,
      generated_by INT NULL,
      generated_at DATETIME(3) NULL,
      cancelled_by INT NULL,
      cancelled_at DATETIME(3) NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE KEY billing_export_sales_eway_uuid_unique (uuid),
      UNIQUE KEY billing_export_sales_eway_bill_unique (bill_number),
      INDEX billing_export_sales_eway_exportSale_status (export_sale_id, status),
      CONSTRAINT billing_export_sales_eway_exportSale_fk FOREIGN KEY (export_sale_id) REFERENCES billing_export_sales (id) ON DELETE RESTRICT,
      CONSTRAINT billing_export_sales_eway_transport_fk FOREIGN KEY (transport_id) REFERENCES transports (id) ON DELETE RESTRICT,
      CONSTRAINT billing_export_sales_eway_generated_by_fk FOREIGN KEY (generated_by) REFERENCES users (id) ON DELETE RESTRICT,
      CONSTRAINT billing_export_sales_eway_cancelled_by_fk FOREIGN KEY (cancelled_by) REFERENCES users (id) ON DELETE RESTRICT
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `
    )
    .execute(database);

  await sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS billing_export_sales_einvoices (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      export_sale_id INT NOT NULL,
      irn VARCHAR(128) NOT NULL,
      ack_number VARCHAR(80) NULL,
      ack_date DATETIME(3) NULL,
      signed_invoice LONGTEXT NULL,
      signed_qr LONGTEXT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'not-generated',
      request_json JSON NULL,
      response_json JSON NULL,
      generated_by INT NULL,
      generated_at DATETIME(3) NULL,
      cancelled_by INT NULL,
      cancelled_at DATETIME(3) NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE KEY billing_export_sales_einvoice_uuid_unique (uuid),
      UNIQUE KEY billing_export_sales_einvoice_irn_unique (irn),
      INDEX billing_export_sales_einvoice_exportSale_status (export_sale_id, status),
      CONSTRAINT billing_export_sales_einvoice_exportSale_fk FOREIGN KEY (export_sale_id) REFERENCES billing_export_sales (id) ON DELETE RESTRICT,
      CONSTRAINT billing_export_sales_einvoice_generated_by_fk FOREIGN KEY (generated_by) REFERENCES users (id) ON DELETE RESTRICT,
      CONSTRAINT billing_export_sales_einvoice_cancelled_by_fk FOREIGN KEY (cancelled_by) REFERENCES users (id) ON DELETE RESTRICT
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `
    )
    .execute(database);

  await sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS billing_export_sales_comments (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      export_sale_id INT NOT NULL,
      parent_comment_id INT NULL,
      comment TEXT NOT NULL,
      visibility VARCHAR(24) NOT NULL DEFAULT 'internal',
      status VARCHAR(24) NOT NULL DEFAULT 'active',
      created_by INT NOT NULL,
      updated_by INT NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      deleted_at DATETIME(3) NULL,
      UNIQUE KEY billing_export_sales_comments_uuid_unique (uuid),
      INDEX billing_export_sales_comments_exportSale_created (export_sale_id, created_at),
      INDEX billing_export_sales_comments_parent (parent_comment_id),
      CONSTRAINT billing_export_sales_comments_exportSale_fk FOREIGN KEY (export_sale_id) REFERENCES billing_export_sales (id) ON DELETE RESTRICT,
      CONSTRAINT billing_export_sales_comments_parent_fk FOREIGN KEY (parent_comment_id) REFERENCES billing_export_sales_comments (id) ON DELETE RESTRICT,
      CONSTRAINT billing_export_sales_comments_created_by_fk FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE RESTRICT,
      CONSTRAINT billing_export_sales_comments_updated_by_fk FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE RESTRICT
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `
    )
    .execute(database);

  await sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS billing_export_sales_activities (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      export_sale_id INT NOT NULL,
      activity_type VARCHAR(80) NOT NULL,
      action VARCHAR(80) NOT NULL,
      description TEXT NOT NULL,
      previous_status VARCHAR(24) NULL,
      new_status VARCHAR(24) NULL,
      actor_user_id INT NULL,
      correlation_id VARCHAR(120) NULL,
      metadata_json JSON NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      UNIQUE KEY billing_export_sales_activities_uuid_unique (uuid),
      INDEX billing_export_sales_activities_exportSale_created (export_sale_id, created_at),
      INDEX billing_export_sales_activities_correlation (correlation_id),
      CONSTRAINT billing_export_sales_activities_exportSale_fk FOREIGN KEY (export_sale_id) REFERENCES billing_export_sales (id) ON DELETE RESTRICT,
      CONSTRAINT billing_export_sales_activities_actor_fk FOREIGN KEY (actor_user_id) REFERENCES users (id) ON DELETE RESTRICT
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `
    )
    .execute(database);

  await sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS billing_export_sales_entry_tools (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      export_sale_id INT NOT NULL,
      tool_key VARCHAR(80) NOT NULL,
      action VARCHAR(80) NOT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'pending',
      input_json JSON NULL,
      result_json JSON NULL,
      error_message TEXT NULL,
      requested_by INT NOT NULL,
      requested_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      completed_at DATETIME(3) NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE KEY billing_export_sales_entry_tools_uuid_unique (uuid),
      INDEX billing_export_sales_entry_tools_exportSale_status (export_sale_id, status),
      INDEX billing_export_sales_entry_tools_requested (requested_by, requested_at),
      CONSTRAINT billing_export_sales_entry_tools_exportSale_fk FOREIGN KEY (export_sale_id) REFERENCES billing_export_sales (id) ON DELETE RESTRICT,
      CONSTRAINT billing_export_sales_entry_tools_requested_by_fk FOREIGN KEY (requested_by) REFERENCES users (id) ON DELETE RESTRICT
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `
    )
    .execute(database);
}

const exportSalesParentTables = [
  "colours",
  "companies",
  "contacts",
  "contacts_addresses",
  "currencies",
  "financial_years",
  "hsn_codes",
  "ledgers",
  "products",
  "sizes",
  "taxes",
  "transports",
  "units",
  "users",
  "work_orders"
] as const;

async function assertExportSalesParentSchema<Database>(database: Kysely<Database>) {
  const result = await sql<{
    column_type: string;
    data_type: string;
    engine: string;
    table_name: string;
  }>`
    SELECT
      tables.TABLE_NAME AS table_name,
      tables.ENGINE AS engine,
      columns.DATA_TYPE AS data_type,
      columns.COLUMN_TYPE AS column_type
    FROM information_schema.TABLES AS tables
    INNER JOIN information_schema.COLUMNS AS columns
      ON columns.TABLE_SCHEMA = tables.TABLE_SCHEMA
      AND columns.TABLE_NAME = tables.TABLE_NAME
      AND columns.COLUMN_NAME = 'id'
    WHERE tables.TABLE_SCHEMA = DATABASE()
      AND tables.TABLE_NAME IN (
        'colours',
        'companies',
        'contacts',
        'contacts_addresses',
        'currencies',
        'financial_years',
        'hsn_codes',
        'ledgers',
        'products',
        'sizes',
        'taxes',
        'transports',
        'units',
        'users',
        'work_orders'
      )
  `.execute(database);

  const parents = new Map(result.rows.map((row) => [row.table_name, row]));
  const missing = exportSalesParentTables.filter((tableName) => !parents.has(tableName));
  const incompatible = result.rows
    .filter(
      ({ column_type, data_type, engine }) =>
        engine.toLowerCase() !== "innodb" ||
        data_type.toLowerCase() !== "int" ||
        column_type.toLowerCase().includes("unsigned")
    )
    .map(({ table_name: tableName }) => tableName)
    .sort();

  if (missing.length === 0 && incompatible.length === 0) return;

  const details = [
    missing.length > 0 ? `missing tables: ${missing.join(", ")}` : "",
    incompatible.length > 0
      ? `tables without a signed INT InnoDB primary identity: ${incompatible.join(", ")}`
      : ""
  ]
    .filter(Boolean)
    .join("; ");

  throw new Error(
    `Export Sales migration requires Core-owned parent schemas before Billing starts (${details}). Start and finish Core API database bootstrap first.`
  );
}

async function assertRelationalExportSalesSchema<Database>(database: Kysely<Database>) {
  const result = await sql<{ data_type: string }>`
    SELECT DATA_TYPE AS data_type
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'billing_export_sales'
      AND COLUMN_NAME = 'id'
  `.execute(database);

  if (result.rows[0]?.data_type.toLowerCase() !== "int") {
    throw new Error(
      "billing_export_sales uses the legacy string-key schema. Apply a fresh or explicit forward data migration before starting Billing API."
    );
  }
}
