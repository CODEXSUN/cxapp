import { sql } from "kysely";
import { currentBillingScope } from "../../../auth/billing-scope.js";
import { getBillingDatabase } from "../../../database/billing-database.js";
import type { CustomerSummaryItem } from "./customer-summary.types.js";

type ContextRow = {
  company_id: number;
  company_name: string;
  financial_year_id: number;
  financial_year_name: string;
};

type SummaryRow = CustomerSummaryItem & {
  balance: string | number;
  credit: string | number;
  debit: string | number;
};

export class CustomerSummaryRepository {
  async context(databaseName: string, companyId?: number) {
    const database = await getBillingDatabase(databaseName);
    const scope = currentBillingScope();
    const result = await sql<ContextRow>`
      SELECT company.id AS company_id, company.name AS company_name,
             financial_year.id AS financial_year_id, financial_year.name AS financial_year_name
      FROM core_companies company CROSS JOIN core_financial_years financial_year
      WHERE company.id=${scope.companyId} AND company.status='active'
        AND financial_year.id=${scope.financialYearId} AND financial_year.status='active'
        ${companyId ? sql`AND company.id=${companyId}` : sql``}
      LIMIT 1
    `.execute(database);
    return result.rows[0] ?? null;
  }

  async summary(databaseName: string, companyId: number): Promise<CustomerSummaryItem[]> {
    const database = await getBillingDatabase(databaseName);
    const { financialYearId } = currentBillingScope();
    const result = await sql<SummaryRow>`
      SELECT contact.id, contact.code, contact.name,
        COALESCE(contact.opening_balance, 0)
          + COALESCE((SELECT SUM(sale.amount) FROM billing_sales sale
            WHERE sale.company_id=${companyId} AND sale.financial_year_id=${financialYearId}
              AND sale.customer_id=contact.id AND sale.status='confirmed' AND sale.deleted_at IS NULL), 0)
          + COALESCE((SELECT SUM(sale.amount) FROM billing_export_sales sale
            WHERE sale.company_id=${companyId} AND sale.financial_year_id=${financialYearId}
              AND sale.customer_id=contact.id AND sale.status='confirmed' AND sale.deleted_at IS NULL), 0) AS debit,
        COALESCE((SELECT SUM(receipt.total_amount) FROM billing_receipts receipt
          WHERE receipt.company_id=${companyId} AND receipt.financial_year_id=${financialYearId}
            AND receipt.customer_id=contact.id AND receipt.status='posted' AND receipt.deleted_at IS NULL), 0) AS credit,
        COALESCE(contact.opening_balance, 0)
          + COALESCE((SELECT SUM(sale.amount) FROM billing_sales sale
            WHERE sale.company_id=${companyId} AND sale.financial_year_id=${financialYearId}
              AND sale.customer_id=contact.id AND sale.status='confirmed' AND sale.deleted_at IS NULL), 0)
          + COALESCE((SELECT SUM(sale.amount) FROM billing_export_sales sale
            WHERE sale.company_id=${companyId} AND sale.financial_year_id=${financialYearId}
              AND sale.customer_id=contact.id AND sale.status='confirmed' AND sale.deleted_at IS NULL), 0)
          - COALESCE((SELECT SUM(receipt.total_amount) FROM billing_receipts receipt
            WHERE receipt.company_id=${companyId} AND receipt.financial_year_id=${financialYearId}
              AND receipt.customer_id=contact.id AND receipt.status='posted' AND receipt.deleted_at IS NULL), 0) AS balance
      FROM core_contacts contact
      WHERE contact.status='active' AND contact.deleted_at IS NULL
        AND (LOWER(COALESCE(contact.type_name, '')) LIKE '%customer%'
          OR EXISTS (SELECT 1 FROM billing_sales sale WHERE sale.customer_id=contact.id
            AND sale.company_id=${companyId} AND sale.financial_year_id=${financialYearId} AND sale.deleted_at IS NULL)
          OR EXISTS (SELECT 1 FROM billing_export_sales sale WHERE sale.customer_id=contact.id
            AND sale.company_id=${companyId} AND sale.financial_year_id=${financialYearId} AND sale.deleted_at IS NULL)
          OR EXISTS (SELECT 1 FROM billing_receipts receipt WHERE receipt.customer_id=contact.id
            AND receipt.company_id=${companyId} AND receipt.financial_year_id=${financialYearId} AND receipt.deleted_at IS NULL))
      HAVING ABS(balance) > 0.004
      ORDER BY contact.name, contact.id
      LIMIT 500
    `.execute(database);
    return result.rows.map((row) => ({
      balance: money(row.balance),
      code: row.code,
      credit: money(row.credit),
      debit: money(row.debit),
      id: Number(row.id),
      name: row.name
    }));
  }
}

function money(value: string | number | null | undefined) {
  return Math.round(Number(value ?? 0) * 100) / 100;
}
