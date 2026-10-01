import { AppError } from "@cxapp/framework/errors";
import { sql, type Transaction } from "kysely";
import type { SalesDatabase } from "./sales.repository-support.js";
import type { SaleSavePayload } from "./sales.types.js";

export async function assertLinkedSaleIdentity(
  database: Transaction<SalesDatabase>,
  saleId: number,
  input?: Pick<SaleSavePayload, "invoiceNumber" | "companyId" | "financialYearId" | "customerId" | "currencyId">
) {
  const result = await sql<{
    invoice_number: string;
    company_id: number;
    financial_year_id: number;
    customer_id: number;
    currency_id: number;
  }>`
    SELECT invoice_number, company_id, financial_year_id, customer_id, currency_id
    FROM billing_sales WHERE id=${saleId} FOR UPDATE
  `.execute(database);
  const sale = result.rows[0];
  if (!sale) throw AppError.notFound("Sales invoice was not found.");
  if (
    input &&
    input.invoiceNumber === sale.invoice_number &&
    input.companyId === sale.company_id &&
    input.financialYearId === sale.financial_year_id &&
    input.customerId === sale.customer_id &&
    input.currencyId === sale.currency_id
  )
    return;
  const links = await sql<{ id: number }>`
    SELECT id FROM billing_quotations
    WHERE generated_sales_invoice_no=${sale.invoice_number}
      AND company_id=${sale.company_id} AND financial_year_id=${sale.financial_year_id}
      AND deleted_at IS NULL LIMIT 1
  `.execute(database);
  if (links.rows.length) {
    throw AppError.conflict(
      input
        ? "This invoice is linked to a quotation. Its number, company, financial year, customer, and currency cannot be changed."
        : "This invoice is linked to a quotation and cannot be deleted."
    );
  }
}
