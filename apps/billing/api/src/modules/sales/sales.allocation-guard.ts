import { AppError } from "@cxapp/framework/errors";
import { sql, type Transaction } from "kysely";
import type { SalesDatabase } from "./sales.repository-support.js";

export async function assertSaleHasNoAllocations(
  database: Transaction<SalesDatabase>,
  saleId: number
) {
  // Match the receipt writer's invoice-first lock order to close the allocation race.
  await sql`SELECT id FROM billing_sales WHERE id = ${saleId} FOR UPDATE`.execute(database);
  const allocations = await sql<{ id: number }>`
    SELECT a.id FROM billing_receipt_allocations a
    INNER JOIN billing_receipts r ON r.id = a.receipt_id
    WHERE a.sales_id = ${saleId} AND a.allocated_amount > 0
      AND r.deleted_at IS NULL AND r.status <> 'cancelled'
    LIMIT 1 FOR UPDATE
  `.execute(database);
  if (allocations.rows.length) {
    throw AppError.conflict(
      "This invoice has receipt allocations. Release its draft or posted allocations before editing, suspending, or deleting it."
    );
  }
}
