import { sql } from "kysely";
import { AppError } from "@cxapp/framework/errors";
import { buildCustomerStatementAgeing } from "./customer-statement.ageing.js";
import { getBillingDatabase } from "../../../database/billing-database.js";
import { currentBillingScope } from "../../../auth/billing-scope.js";
import { readOpeningBalanceOverrides } from "../../opening-balance/index.js";
import type {
  CustomerStatementContact,
  CustomerStatementLine
} from "./customer-statement.types.js";

type ContextRow = {
  company_id: number;
  company_name: string;
  financial_year_end: string;
  financial_year_id: number;
  financial_year_name: string;
  financial_year_start: string;
};

type MovementRow = {
  balance: string | number;
  credit: string | number;
  document_date: string;
  document_id: string;
  document_number: string;
  document_kind: CustomerStatementLine["kind"];
  narration: string;
  debit: string | number;
};

export class CustomerStatementRepository {
  async ageing(
    databaseName: string,
    companyId: number,
    contactId: number,
    to: string,
    yearStart: string
  ) {
    const database = await getBillingDatabase(databaseName);
    const { financialYearId } = currentBillingScope();
    const invoices = await sql<{ date: string; amount: string | number; settled: string | number }>`
      SELECT DATE_FORMAT(sale.issued_on,'%Y-%m-%d') AS date, sale.amount,
 COALESCE((SELECT SUM(allocation.allocated_amount)
 FROM billing_receipt_allocations allocation JOIN billing_receipts receipt ON receipt.id=allocation.receipt_id
 WHERE allocation.sales_id=sale.id AND receipt.status='posted' AND receipt.deleted_at IS NULL
 AND receipt.company_id=${companyId} AND receipt.financial_year_id=${financialYearId}
 AND receipt.customer_id=${contactId} AND receipt.receipt_date<=${to}),0) AS settled
 FROM billing_sales sale
 WHERE sale.company_id=${companyId} AND sale.financial_year_id=${financialYearId}
 AND sale.customer_id=${contactId} AND sale.status='confirmed' AND sale.deleted_at IS NULL
 AND sale.issued_on<=${to}
 UNION ALL SELECT DATE_FORMAT(sale.issued_on,'%Y-%m-%d'), sale.amount,
 COALESCE((SELECT SUM(allocation.allocated_amount)
 FROM billing_receipt_export_allocations allocation JOIN billing_receipts receipt ON receipt.id=allocation.receipt_id
 WHERE allocation.export_sales_id=sale.id AND receipt.status='posted' AND receipt.deleted_at IS NULL
 AND receipt.company_id=${companyId} AND receipt.financial_year_id=${financialYearId}
 AND receipt.customer_id=${contactId} AND receipt.receipt_date<=${to}),0)
 FROM billing_export_sales sale WHERE sale.company_id=${companyId}
 AND sale.financial_year_id=${financialYearId} AND sale.customer_id=${contactId}
 AND sale.status='confirmed' AND sale.deleted_at IS NULL AND sale.issued_on<=${to}
      ORDER BY date
    `.execute(database);
    const settlements = await sql<{ total: string | number; reserved: string | number }>`
      SELECT COALESCE(SUM(CASE WHEN status='posted' THEN total_amount ELSE 0 END),0) AS total,
      COALESCE(SUM(CASE WHEN status='draft' THEN allocated_amount ELSE 0 END),0) AS reserved
      FROM billing_receipts WHERE company_id=${companyId} AND financial_year_id=${financialYearId}
      AND customer_id=${contactId} AND deleted_at IS NULL AND receipt_date<=${to}
    `.execute(database);
    const opening = await this.openingBalance(databaseName, companyId, contactId, yearStart);
    const applied = invoices.rows.reduce((sum, row) => sum + Number(row.settled), 0);
    if (
      invoices.rows.some((row) => Number(row.settled) - Number(row.amount) > 0.005) ||
      applied - Number(settlements.rows[0]?.total ?? 0) > 0.005
    )
      throw AppError.conflict(
        "Posted allocations exceed invoice or settlement amounts. Review allocations before printing."
      );
    return buildCustomerStatementAgeing(
      invoices.rows.map((row) => ({
        date: row.date,
        amount: Number(row.amount) - Number(row.settled)
      })),
      opening,
      Number(settlements.rows[0]?.total ?? 0) - applied,
      Number(settlements.rows[0]?.reserved ?? 0),
      to
    );
  }

  async context(databaseName: string, companyId?: number) {
    const database = await getBillingDatabase(databaseName);
    const scope = currentBillingScope();
    const result = await sql<ContextRow>`
      SELECT company.id AS company_id, company.name AS company_name, financial_year.id AS financial_year_id,
             financial_year.name AS financial_year_name,
             DATE_FORMAT(financial_year.start_date, '%Y-%m-%d') AS financial_year_start,
             DATE_FORMAT(financial_year.end_date, '%Y-%m-%d') AS financial_year_end
      FROM core_companies company CROSS JOIN core_financial_years financial_year
      WHERE company.id=${scope.companyId} AND company.status='active'
        AND financial_year.id=${scope.financialYearId} AND financial_year.status='active'
        ${companyId ? sql`AND company.id=${companyId}` : sql``}
      LIMIT 1
    `.execute(database);
    return result.rows[0] ?? null;
  }

  async contacts(databaseName: string, companyId: number): Promise<CustomerStatementContact[]> {
    const database = await getBillingDatabase(databaseName);
    const { financialYearId } = currentBillingScope();
    const result = await sql<{
      code: string;
      gstin: string | null;
      id: number;
      name: string;
    }>`
      SELECT contact.id, contact.code, contact.name, contact.gstin
      FROM core_contacts contact
      WHERE contact.deleted_at IS NULL
        AND (
          LOWER(COALESCE(contact.type_name,'')) LIKE '%customer%'
          OR EXISTS (SELECT 1 FROM billing_sales sale WHERE sale.customer_id=contact.id
            AND sale.company_id=${companyId} AND sale.financial_year_id=${financialYearId} AND sale.deleted_at IS NULL)
          OR EXISTS (SELECT 1 FROM billing_export_sales sale WHERE sale.customer_id=contact.id
            AND sale.company_id=${companyId} AND sale.financial_year_id=${financialYearId} AND sale.deleted_at IS NULL)
          OR EXISTS (SELECT 1 FROM billing_receipts receipt WHERE receipt.customer_id=contact.id
            AND receipt.company_id=${companyId} AND receipt.financial_year_id=${financialYearId} AND receipt.deleted_at IS NULL)
        )
      ORDER BY contact.name, contact.id
    `.execute(database);
    return result.rows.map((row) => ({
      code: row.code,
      gstin: row.gstin ?? "",
      id: Number(row.id),
      name: row.name
    }));
  }

  async openingBalance(databaseName: string, companyId: number, contactId: number, from: string) {
    const database = await getBillingDatabase(databaseName);
    const { financialYearId } = currentBillingScope();
    const result = await sql<{ balance: string | number; legacy: string | number }>`
      SELECT COALESCE(contact.opening_balance,0) AS legacy, COALESCE(contact.opening_balance,0)
        + COALESCE((SELECT SUM(sale.amount) FROM billing_sales sale
          WHERE sale.company_id=${companyId} AND sale.financial_year_id=${financialYearId} AND sale.customer_id=${contactId}
            AND sale.status='confirmed' AND sale.deleted_at IS NULL AND sale.issued_on<${from}),0)
        + COALESCE((SELECT SUM(sale.amount) FROM billing_export_sales sale
          WHERE sale.company_id=${companyId} AND sale.financial_year_id=${financialYearId} AND sale.customer_id=${contactId}
            AND sale.status='confirmed' AND sale.deleted_at IS NULL AND sale.issued_on<${from}),0)
        - COALESCE((SELECT SUM(receipt.total_amount) FROM billing_receipts receipt
          WHERE receipt.company_id=${companyId} AND receipt.financial_year_id=${financialYearId} AND receipt.customer_id=${contactId}
            AND receipt.status='posted' AND receipt.deleted_at IS NULL
            AND receipt.receipt_date<${from}),0) AS balance
      FROM core_contacts contact WHERE contact.id=${contactId} LIMIT 1
    `.execute(database);
    const overrides = await readOpeningBalanceOverrides(databaseName, "customer");
    const row = result.rows[0];
    return money(
      Number(row?.balance ?? 0) +
        (overrides.has(contactId) ? overrides.get(contactId)! - Number(row?.legacy ?? 0) : 0)
    );
  }

  async summary(
    databaseName: string,
    companyId: number,
    contactId: number,
    from: string,
    to: string
  ) {
    const database = await getBillingDatabase(databaseName);
    const result = await sql<{ credit: string | number; debit: string | number; total: number }>`
      SELECT COALESCE(SUM(movement.debit),0) AS debit,
             COALESCE(SUM(movement.credit),0) AS credit,
             COUNT(*) AS total
      FROM (${customerMovements(companyId, contactId, from, to)}) movement
    `.execute(database);
    const row = result.rows[0];
    return {
      credit: money(row?.credit),
      debit: money(row?.debit),
      total: Number(row?.total ?? 0)
    };
  }

  async lines(
    databaseName: string,
    query: {
      companyId: number;
      contactId: number;
      from: string;
      page: number;
      pageSize: number;
      to: string;
    },
    openingBalance: number
  ): Promise<CustomerStatementLine[]> {
    const database = await getBillingDatabase(databaseName);
    const offset = (query.page - 1) * query.pageSize;
    const result = await sql<MovementRow>`
      WITH movements AS (${customerMovements(query.companyId, query.contactId, query.from, query.to)}),
      balanced AS (
        SELECT movements.*,
          ${openingBalance} + SUM(debit-credit) OVER (
            ORDER BY document_date, kind_order, internal_id
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
          ) AS balance
        FROM movements
      )
      SELECT document_id, document_number, document_kind, document_date, narration,
             debit, credit, balance
      FROM balanced
      ORDER BY document_date, kind_order, internal_id
      LIMIT ${query.pageSize} OFFSET ${offset}
    `.execute(database);
    return result.rows.map((row) => ({
      balance: money(row.balance),
      credit: money(row.credit),
      date: row.document_date,
      debit: money(row.debit),
      documentId: row.document_id,
      documentNumber: row.document_number,
      kind: row.document_kind,
      narration: row.narration
    }));
  }
}

function customerMovements(companyId: number, contactId: number, from: string, to: string) {
  const { financialYearId } = currentBillingScope();
  return sql`
    SELECT sale.id AS internal_id, 1 AS kind_order, sale.uuid AS document_id,
           sale.invoice_number AS document_number, 'sale' AS document_kind,
           DATE_FORMAT(sale.issued_on,'%Y-%m-%d') AS document_date,
           'Sales invoice' AS narration, sale.amount AS debit, 0 AS credit
    FROM billing_sales sale
    WHERE sale.company_id=${companyId} AND sale.financial_year_id=${financialYearId} AND sale.customer_id=${contactId}
      AND sale.status='confirmed' AND sale.deleted_at IS NULL
      AND sale.issued_on BETWEEN ${from} AND ${to}
    UNION ALL
    SELECT sale.id, 2, sale.uuid, sale.invoice_number, 'export-sale',
           DATE_FORMAT(sale.issued_on,'%Y-%m-%d'), 'Export sales invoice', sale.amount, 0
    FROM billing_export_sales sale
    WHERE sale.company_id=${companyId} AND sale.financial_year_id=${financialYearId} AND sale.customer_id=${contactId}
      AND sale.status='confirmed' AND sale.deleted_at IS NULL
      AND sale.issued_on BETWEEN ${from} AND ${to}
    UNION ALL
    SELECT receipt.id, 3, receipt.uuid, receipt.receipt_number, 'receipt',
           DATE_FORMAT(receipt.receipt_date,'%Y-%m-%d'),
           CONCAT('Receipt - ', receipt.receipt_mode), 0, receipt.total_amount
    FROM billing_receipts receipt
    WHERE receipt.company_id=${companyId} AND receipt.financial_year_id=${financialYearId} AND receipt.customer_id=${contactId}
      AND receipt.status='posted' AND receipt.deleted_at IS NULL
      AND receipt.receipt_date BETWEEN ${from} AND ${to}
  `;
}

function money(value: string | number | null | undefined) {
  return Math.round(Number(value ?? 0) * 100) / 100;
}
