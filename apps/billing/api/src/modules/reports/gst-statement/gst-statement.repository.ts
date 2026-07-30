import { sql } from "kysely";
import { getBillingDatabase } from "../../../database/billing-database.js";
import { currentBillingScope } from "../../../auth/billing-scope.js";
import type { GstStatementLine } from "./gst-statement.types.js";

type ContextRow = {
  company_id: number;
  company_name: string;
  financial_year_end: string;
  financial_year_id: number;
  financial_year_name: string;
  financial_year_start: string;
};

type GstRow = {
  cgst_amount: string | number;
  direction: GstStatementLine["direction"];
  document_count: number;
  igst_amount: string | number;
  sgst_amount: string | number;
  tax_amount: string | number;
  taxable_amount: string | number;
  tax_rate: string | number;
};

export class GstStatementRepository {
  async context(databaseName: string, companyId?: number) {
    const database = await getBillingDatabase(databaseName);
    const scope = currentBillingScope();
    const result = await sql<ContextRow>`
      SELECT company.id AS company_id, company.name AS company_name, financial_year.id AS financial_year_id,
             financial_year.name AS financial_year_name,
             DATE_FORMAT(financial_year.start_date, '%Y-%m-%d') AS financial_year_start,
             DATE_FORMAT(financial_year.end_date, '%Y-%m-%d') AS financial_year_end
      FROM companies company CROSS JOIN financial_years financial_year
      WHERE company.id=${scope.companyId} AND company.status='active'
        AND financial_year.id=${scope.financialYearId} AND financial_year.status='active'
        ${companyId ? sql`AND company.id=${companyId}` : sql``}
      LIMIT 1
    `.execute(database);
    return result.rows[0] ?? null;
  }

  async lines(
    databaseName: string,
    companyId: number,
    from: string,
    to: string,
    page: number,
    pageSize: number
  ): Promise<GstStatementLine[]> {
    const database = await getBillingDatabase(databaseName);
    const offset = (page - 1) * pageSize;
    const result = await sql<GstRow>`
      ${gstRows(companyId, from, to)}
      ORDER BY direction DESC, tax_rate
      LIMIT ${pageSize} OFFSET ${offset}
    `.execute(database);
    return result.rows.map(toGstLine);
  }

  async summary(databaseName: string, companyId: number, from: string, to: string) {
    const database = await getBillingDatabase(databaseName);
    const result = await sql<{
      cgst_amount: string | number;
      igst_amount: string | number;
      inward_tax_amount: string | number;
      inward_taxable_amount: string | number;
      outward_tax_amount: string | number;
      outward_taxable_amount: string | number;
      sgst_amount: string | number;
      tax_amount: string | number;
      total: number;
    }>`
      SELECT COUNT(*) AS total,
             COALESCE(SUM(CASE WHEN gst_values.direction='inward' THEN gst_values.taxable_amount ELSE 0 END),0)
               AS inward_taxable_amount,
             COALESCE(SUM(CASE WHEN gst_values.direction='outward' THEN gst_values.taxable_amount ELSE 0 END),0)
               AS outward_taxable_amount,
             COALESCE(SUM(CASE WHEN gst_values.direction='inward' THEN gst_values.tax_amount ELSE 0 END),0)
               AS inward_tax_amount,
             COALESCE(SUM(CASE WHEN gst_values.direction='outward' THEN gst_values.tax_amount ELSE 0 END),0)
               AS outward_tax_amount,
             COALESCE(SUM(gst_values.cgst_amount),0) AS cgst_amount,
             COALESCE(SUM(gst_values.sgst_amount),0) AS sgst_amount,
             COALESCE(SUM(gst_values.igst_amount),0) AS igst_amount,
             COALESCE(SUM(gst_values.tax_amount),0) AS tax_amount
      FROM (${gstRows(companyId, from, to)}) gst_values
    `.execute(database);
    const row = result.rows[0];
    return {
      cgstAmount: money(row?.cgst_amount),
      igstAmount: money(row?.igst_amount),
      inwardTaxAmount: money(row?.inward_tax_amount),
      inwardTaxableAmount: money(row?.inward_taxable_amount),
      netTaxPayable: money(row?.outward_tax_amount) - money(row?.inward_tax_amount),
      outwardTaxAmount: money(row?.outward_tax_amount),
      outwardTaxableAmount: money(row?.outward_taxable_amount),
      sgstAmount: money(row?.sgst_amount),
      taxAmount: money(row?.tax_amount),
      total: Number(row?.total ?? 0)
    };
  }
}

function gstRows(companyId: number, from: string, to: string) {
  const { financialYearId } = currentBillingScope();
  return sql`
    SELECT movement.direction, movement.tax_rate,
           COUNT(DISTINCT CONCAT(movement.source, ':', movement.document_id)) AS document_count,
           SUM(movement.taxable_amount) AS taxable_amount,
           SUM(movement.cgst_amount) AS cgst_amount,
           SUM(movement.sgst_amount) AS sgst_amount,
           SUM(movement.igst_amount) AS igst_amount,
           SUM(movement.tax_amount) AS tax_amount
    FROM (
      SELECT 'outward' AS direction, 'sale' AS source, sale.id AS document_id,
             item.tax_rate, item.taxable_amount, item.cgst_amount, item.sgst_amount,
             item.igst_amount, item.tax_amount
      FROM billing_sales_items item
      INNER JOIN billing_sales sale ON sale.id=item.sales_id
      WHERE sale.company_id=${companyId} AND sale.financial_year_id=${financialYearId} AND sale.status='confirmed' AND sale.deleted_at IS NULL
        AND sale.issued_on BETWEEN ${from} AND ${to}
      UNION ALL
      SELECT 'outward', 'export-sale', sale.id, item.tax_rate, item.taxable_amount,
             item.cgst_amount, item.sgst_amount, item.igst_amount, item.tax_amount
      FROM billing_export_sales_items item
      INNER JOIN billing_export_sales sale ON sale.id=item.export_sale_id
      WHERE sale.company_id=${companyId} AND sale.financial_year_id=${financialYearId} AND sale.status='confirmed' AND sale.deleted_at IS NULL
        AND sale.issued_on BETWEEN ${from} AND ${to}
      UNION ALL
      SELECT 'inward', 'purchase', purchase.id, item.tax_rate, item.taxable_amount,
             item.cgst_amount, item.sgst_amount, item.igst_amount, item.tax_amount
      FROM billing_purchase_items item
      INNER JOIN billing_purchases purchase ON purchase.id=item.purchase_id
      WHERE purchase.company_id=${companyId} AND purchase.financial_year_id=${financialYearId} AND purchase.status='confirmed'
        AND purchase.deleted_at IS NULL AND purchase.purchase_date BETWEEN ${from} AND ${to}
    ) movement
    GROUP BY movement.direction, movement.tax_rate
  `;
}

function toGstLine(row: GstRow): GstStatementLine {
  return {
    cgstAmount: money(row.cgst_amount),
    direction: row.direction,
    documentCount: Number(row.document_count),
    igstAmount: money(row.igst_amount),
    sgstAmount: money(row.sgst_amount),
    taxAmount: money(row.tax_amount),
    taxableAmount: money(row.taxable_amount),
    taxRate: Math.round(Number(row.tax_rate ?? 0) * 10_000) / 10_000
  };
}

function money(value: string | number | null | undefined) {
  return Math.round(Number(value ?? 0) * 100) / 100;
}
