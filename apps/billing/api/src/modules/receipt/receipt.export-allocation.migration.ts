import { sql, type Kysely } from "kysely";

export const receiptExportAllocationMigration = {
  key: "billing.receipt.export-allocations-v1",
  description: "Add export invoice settlement without rewriting domestic allocations."
};

export async function migrateReceiptExportAllocations<Database>(database: Kysely<Database>) {
  await sql
    .raw(
      `CREATE TABLE IF NOT EXISTS billing_receipt_export_allocations (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(8) NOT NULL,
    receipt_id INT NOT NULL,
    export_sales_id INT NOT NULL,
    line_number INT NOT NULL,
    allocated_amount DECIMAL(18,2) NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'active',
    created_by VARCHAR(191) NOT NULL DEFAULT 'system:migration',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE KEY billing_receipt_export_allocations_uuid_unique (uuid),
    UNIQUE KEY billing_receipt_export_allocations_document_unique (receipt_id, export_sales_id),
    UNIQUE KEY billing_receipt_export_allocations_line_unique (receipt_id, line_number),
    INDEX billing_receipt_export_allocations_document (export_sales_id),
    CONSTRAINT billing_receipt_export_allocations_receipt_fk FOREIGN KEY (receipt_id)
      REFERENCES billing_receipts (id) ON DELETE RESTRICT,
    CONSTRAINT billing_receipt_export_allocations_document_fk FOREIGN KEY (export_sales_id)
      REFERENCES billing_export_sales (id) ON DELETE RESTRICT
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
    .execute(database);
}
