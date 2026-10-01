import { AppError } from "@cxapp/framework/errors";
import { sql, type Transaction } from "kysely";
import type { PurchaseDatabase } from "./purchase.repository-support.js";

export async function assertPurchaseHasNoAllocations(
  database: Transaction<PurchaseDatabase>,
  purchaseId: number
) {
  // Match the payment writer's invoice-first lock order to close the allocation race.
  await sql`SELECT id FROM billing_purchases WHERE id = ${purchaseId} FOR UPDATE`.execute(database);
  const allocations = await sql<{ id: number }>`
    SELECT a.id FROM billing_payment_allocations a
    INNER JOIN billing_payments p ON p.id = a.payment_id
    WHERE a.purchase_id = ${purchaseId} AND a.allocated_amount > 0
      AND p.deleted_at IS NULL AND p.status <> 'cancelled'
    LIMIT 1 FOR UPDATE
  `.execute(database);
  if (allocations.rows.length) {
    throw AppError.conflict(
      "This purchase has payment allocations. Release its draft or posted allocations before editing, suspending, or deleting it."
    );
  }
}
