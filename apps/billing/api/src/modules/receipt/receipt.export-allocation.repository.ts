import { randomBytes } from "node:crypto";
import { sql, type Kysely, type Transaction } from "kysely";
import { AppError } from "@cxapp/framework/errors";
import { currentBillingScope } from "../../auth/billing-scope.js";
import type { ReceiptAllocationCandidate, ReceiptSavePayload } from "./receipt.types.js";

type Database = Record<string, never>;

export class ReceiptExportAllocationRepository {
  async candidates(
    database: Kysely<Database>,
    customerId: number
  ): Promise<ReceiptAllocationCandidate[]> {
    const scope = currentBillingScope();
    const result = await sql<{
      uuid: string;
      customer_id: number;
      currency_id: number;
      currency_code: string;
      invoice_number: string;
      issued_on: Date | string;
      amount: string | number;
      available: string | number;
    }>`SELECT s.uuid, s.customer_id, s.currency_id, currency.name AS currency_code, s.invoice_number, s.issued_on, s.amount,
      s.amount - COALESCE(SUM(CASE WHEN r.status <> 'cancelled' AND r.deleted_at IS NULL
        THEN a.allocated_amount ELSE 0 END), 0) AS available
      FROM billing_export_sales s
      INNER JOIN core_currencies currency ON currency.id=s.currency_id AND currency.status='active'
      LEFT JOIN billing_receipt_export_allocations a ON a.export_sales_id=s.id
      LEFT JOIN billing_receipts r ON r.id=a.receipt_id
      WHERE s.company_id=${scope.companyId} AND s.financial_year_id=${scope.financialYearId}
        AND s.customer_id=${customerId} AND s.status='confirmed' AND s.deleted_at IS NULL
      GROUP BY s.id, s.uuid, s.customer_id, s.currency_id, currency.name, s.invoice_number, s.issued_on, s.amount
      HAVING available > 0 ORDER BY s.issued_on, s.uuid`.execute(database);
    return result.rows.map((row) => ({
      documentKind: "export-sale",
      saleId: row.uuid,
      customerId: row.customer_id,
      currencyId: row.currency_id,
      currencyCode: row.currency_code,
      documentNo: row.invoice_number,
      documentDate:
        row.issued_on instanceof Date
          ? row.issued_on.toISOString().slice(0, 10)
          : String(row.issued_on).slice(0, 10),
      documentTotal: Number(row.amount),
      outstandingAmount: Number(row.available)
    }));
  }

  async validate(
    database: Kysely<Database>,
    input: ReceiptSavePayload,
    saleId: string,
    amount: number,
    excludeUuid?: string
  ) {
    const result = await sql<{ available: string | number }>`SELECT s.amount - COALESCE((
      SELECT SUM(a.allocated_amount) FROM billing_receipt_export_allocations a
      INNER JOIN billing_receipts r ON r.id=a.receipt_id
      WHERE a.export_sales_id=s.id AND r.status<>'cancelled' AND r.deleted_at IS NULL
        ${excludeUuid ? sql`AND r.uuid<>${excludeUuid}` : sql``}
    ),0) AS available FROM billing_export_sales s
      WHERE s.uuid=${saleId} AND s.company_id=${input.companyId}
        AND s.financial_year_id=${input.financialYearId} AND s.customer_id=${input.customerId}
        AND s.currency_id=${input.currencyId} AND s.status='confirmed' AND s.deleted_at IS NULL`.execute(
      database
    );
    return Number(result.rows[0]?.available ?? -1) >= amount;
  }

  async assertAvailable(
    transaction: Transaction<Database>,
    input: ReceiptSavePayload,
    saleId: string,
    amount: number,
    excludeReceiptId?: number
  ) {
    const result = await sql<{ id: number; amount: string | number }>`
      SELECT id, amount FROM billing_export_sales WHERE uuid=${saleId}
        AND company_id=${input.companyId} AND financial_year_id=${input.financialYearId}
        AND customer_id=${input.customerId} AND currency_id=${input.currencyId}
        AND status='confirmed' AND deleted_at IS NULL FOR UPDATE`.execute(transaction);
    const sale = result.rows[0];
    if (!sale) throw AppError.validation("Export invoice is no longer available for this receipt.");
    const reserved = await sql<{ amount: string | number }>`
      SELECT COALESCE(SUM(a.allocated_amount),0) AS amount FROM billing_receipt_export_allocations a
      INNER JOIN billing_receipts r ON r.id=a.receipt_id
      WHERE a.export_sales_id=${sale.id} AND r.status<>'cancelled' AND r.deleted_at IS NULL
        ${excludeReceiptId ? sql`AND r.id<>${excludeReceiptId}` : sql``}`.execute(transaction);
    if (Number(sale.amount) - Number(reserved.rows[0]?.amount ?? 0) + 0.000001 < amount)
      throw AppError.conflict("Export invoice balance changed. Refresh and try again.");
  }

  async insert(
    transaction: Transaction<Database>,
    receiptId: number,
    saleId: string,
    amount: number,
    line: number
  ) {
    await sql`INSERT INTO billing_receipt_export_allocations
      (uuid, receipt_id, export_sales_id, allocated_amount, line_number)
      SELECT ${randomBytes(4).toString("hex")}, ${receiptId}, s.id, ${amount}, ${line}
      FROM billing_export_sales s INNER JOIN billing_receipts r ON r.id=${receiptId}
      WHERE s.uuid=${saleId} AND s.company_id=r.company_id AND s.financial_year_id=r.financial_year_id
        AND s.customer_id=r.customer_id AND s.currency_id=r.currency_id`.execute(transaction);
  }
}
