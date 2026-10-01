import { sql, type Kysely } from "kysely";
import { AppError } from "@cxapp/framework/errors";
import { currentBillingScope } from "../../auth/billing-scope.js";

export async function assertExportInvoiceUnallocated<Database>(
  database: Kysely<Database>,
  id: number
) {
  const scope = currentBillingScope();
  const invoice = await sql<{ id: number }>`SELECT id FROM billing_export_sales
    WHERE id=${id} AND company_id=${scope.companyId} AND financial_year_id=${scope.financialYearId}
      AND deleted_at IS NULL FOR UPDATE`.execute(database);
  if (!invoice.rows[0]) throw AppError.conflict("Export invoice is no longer available.");
  const result = await sql<{ id: number }>`SELECT a.id FROM billing_receipt_export_allocations a
    INNER JOIN billing_receipts r ON r.id=a.receipt_id
    WHERE a.export_sales_id=${id} AND r.status<>'cancelled' AND r.deleted_at IS NULL LIMIT 1`.execute(
    database
  );
  if (result.rows.length)
    throw AppError.conflict(
      "Export invoice has active receipt allocations. Cancel those receipts before changing the invoice."
    );
}
