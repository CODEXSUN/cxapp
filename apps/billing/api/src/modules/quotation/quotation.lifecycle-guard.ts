import { AppError } from "@cxapp/framework/errors";
import { sql, type Transaction } from "kysely";
import type { QuotationDatabase } from "./quotation.repository-support.js";
import type { QuotationStatus } from "./quotation.types.js";

export async function assertQuotationMutable(
  database: Transaction<QuotationDatabase>,
  id: number,
  expectedStatus: QuotationStatus
) {
  const result = await sql<{
    status: QuotationStatus;
    generated_sales_invoice_no: string | null;
    deleted_at: Date | null;
  }>`
    SELECT status, generated_sales_invoice_no, deleted_at
    FROM billing_quotations WHERE id=${id} FOR UPDATE
  `.execute(database);
  const current = result.rows[0];
  if (!current || current.deleted_at) throw AppError.notFound("Quotation was not found.");
  if (current.generated_sales_invoice_no) {
    throw AppError.conflict("This quotation is linked to an invoice and cannot be changed.");
  }
  if (current.status !== expectedStatus) {
    throw AppError.conflict("Quotation status changed. Refresh before trying again.");
  }
}
