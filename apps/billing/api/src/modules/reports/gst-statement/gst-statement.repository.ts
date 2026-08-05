import { sql } from "kysely";
import { currentBillingScope } from "../../../auth/billing-scope.js";
import { getBillingDatabase } from "../../../database/billing-database.js";
import type {
  GstStatementDocument,
  GstStatementFiling,
  GstStatementFilingPayload,
  GstStatementHsnLine,
  GstStatementPanel
} from "./gst-statement.types.js";

type ContextRow = {
  company_gstin: string | null;
  company_id: number;
  company_name: string;
  financial_year_end: string;
  financial_year_id: number;
  financial_year_name: string;
  financial_year_start: string;
};

type DocumentRow = {
  cgst_amount: string | number;
  contact_name: string;
  document_date: string;
  document_number: string;
  document_type: GstStatementDocument["documentType"];
  gstin: string | null;
  igst_amount: string | number;
  invoice_total: string | number;
  sgst_amount: string | number;
  taxable_amount: string | number;
  tax_rates: string | null;
};

type HsnRow = {
  cgst_amount: string | number;
  hsn_code: string | null;
  igst_amount: string | number;
  product_name: string;
  sgst_amount: string | number;
  taxable_amount: string | number;
  total_quantity: string | number;
};

type FilingRow = {
  gstr1_arn: string;
  gstr1_filed_on: string | null;
  gstr3b_arn: string;
  gstr3b_filed_on: string | null;
  opening_balance: string | number;
  updated_at: string | null;
};

export class GstStatementRepository {
  async context(databaseName: string, companyId?: number) {
    const database = await getBillingDatabase(databaseName);
    const scope = currentBillingScope();
    const result = await sql<ContextRow>`
      SELECT company.id AS company_id, company.name AS company_name, company.gstin AS company_gstin,
             financial_year.id AS financial_year_id, financial_year.name AS financial_year_name,
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

  async panel(
    databaseName: string,
    direction: "purchase" | "sales",
    companyId: number,
    from: string,
    to: string
  ): Promise<GstStatementPanel> {
    const database = await getBillingDatabase(databaseName);
    const documentResult = await (direction === "sales"
      ? salesDocuments(companyId, from, to).execute(database)
      : purchaseDocuments(companyId, from, to).execute(database));
    const hsnResult = await (direction === "sales"
      ? salesHsn(companyId, from, to).execute(database)
      : purchaseHsn(companyId, from, to).execute(database));
    const documents = (documentResult.rows as DocumentRow[]).map((row, index) =>
      toDocument(row, index)
    );
    const hsn = (hsnResult.rows as HsnRow[]).map(toHsnLine);
    return panelSummary(documents, hsn);
  }

  async filing(
    databaseName: string,
    companyId: number,
    financialYearId: number,
    year: number,
    month: number
  ): Promise<GstStatementFiling> {
    const database = await getBillingDatabase(databaseName);
    const result = await sql<FilingRow>`
      SELECT opening_balance, gstr1_arn, DATE_FORMAT(gstr1_filed_on, '%Y-%m-%d') AS gstr1_filed_on,
             gstr3b_arn, DATE_FORMAT(gstr3b_filed_on, '%Y-%m-%d') AS gstr3b_filed_on,
             DATE_FORMAT(updated_at, '%Y-%m-%dT%H:%i:%s.000Z') AS updated_at
      FROM billing_gst_filings
      WHERE company_id=${companyId} AND financial_year_id=${financialYearId}
        AND filing_year=${year} AND filing_month=${month} AND status='active'
      LIMIT 1
    `.execute(database);
    return toFiling(result.rows[0]);
  }

  async saveFiling(
    databaseName: string,
    companyId: number,
    financialYearId: number,
    input: GstStatementFilingPayload
  ) {
    const database = await getBillingDatabase(databaseName);
    await sql`
      INSERT INTO billing_gst_filings
        (company_id, financial_year_id, filing_year, filing_month, opening_balance,
         gstr1_arn, gstr1_filed_on, gstr3b_arn, gstr3b_filed_on, updated_by)
      VALUES
        (${companyId}, ${financialYearId}, ${input.year}, ${input.month}, ${input.openingBalance},
         ${input.gstr1Arn}, ${input.gstr1FiledOn}, ${input.gstr3bArn}, ${input.gstr3bFiledOn},
         'tenant:gst-statement')
      ON DUPLICATE KEY UPDATE
        opening_balance=VALUES(opening_balance), gstr1_arn=VALUES(gstr1_arn),
        gstr1_filed_on=VALUES(gstr1_filed_on), gstr3b_arn=VALUES(gstr3b_arn),
        gstr3b_filed_on=VALUES(gstr3b_filed_on), updated_by=VALUES(updated_by),
        status='active', updated_at=CURRENT_TIMESTAMP(3)
    `.execute(database);
    return this.filing(databaseName, companyId, financialYearId, input.year, input.month);
  }
}

function salesDocuments(companyId: number, from: string, to: string) {
  const { financialYearId } = currentBillingScope();
  return sql<DocumentRow>`
    SELECT movement.document_type, movement.document_number, movement.document_date,
           movement.gstin, movement.contact_name, movement.invoice_total,
           SUM(movement.taxable_amount) AS taxable_amount,
           SUM(movement.cgst_amount) AS cgst_amount,
           SUM(movement.sgst_amount) AS sgst_amount,
           SUM(movement.igst_amount) AS igst_amount,
           GROUP_CONCAT(DISTINCT movement.tax_rate ORDER BY movement.tax_rate SEPARATOR ',') AS tax_rates
    FROM (
      SELECT 'sale' AS document_type, sale.id AS document_id, sale.invoice_number AS document_number,
             DATE_FORMAT(sale.issued_on, '%Y-%m-%d') AS document_date,
             contact.gstin, contact.name AS contact_name, sale.amount AS invoice_total,
             item.tax_rate, item.taxable_amount, item.cgst_amount, item.sgst_amount, item.igst_amount
      FROM billing_sales sale
      INNER JOIN billing_sales_items item ON item.sales_id=sale.id
      INNER JOIN core_contacts contact ON contact.id=sale.customer_id
      WHERE sale.company_id=${companyId} AND sale.financial_year_id=${financialYearId}
        AND sale.status='confirmed' AND sale.deleted_at IS NULL
        AND sale.issued_on BETWEEN ${from} AND ${to}
      UNION ALL
      SELECT 'export-sale', sale.id, sale.invoice_number,
             DATE_FORMAT(sale.issued_on, '%Y-%m-%d'), contact.gstin, contact.name,
             sale.amount, item.tax_rate, item.taxable_amount, item.cgst_amount,
             item.sgst_amount, item.igst_amount
      FROM billing_export_sales sale
      INNER JOIN billing_export_sales_items item ON item.export_sale_id=sale.id
      INNER JOIN core_contacts contact ON contact.id=sale.customer_id
      WHERE sale.company_id=${companyId} AND sale.financial_year_id=${financialYearId}
        AND sale.status='confirmed' AND sale.deleted_at IS NULL
        AND sale.issued_on BETWEEN ${from} AND ${to}
    ) movement
    GROUP BY movement.document_type, movement.document_id, movement.document_number,
             movement.document_date, movement.gstin, movement.contact_name, movement.invoice_total
    ORDER BY movement.document_date, movement.document_number
  `;
}

function purchaseDocuments(companyId: number, from: string, to: string) {
  const { financialYearId } = currentBillingScope();
  return sql<DocumentRow>`
    SELECT 'purchase' AS document_type, purchase.purchase_number AS document_number,
           DATE_FORMAT(purchase.purchase_date, '%Y-%m-%d') AS document_date,
           contact.gstin, contact.name AS contact_name, purchase.amount AS invoice_total,
           SUM(item.taxable_amount) AS taxable_amount, SUM(item.cgst_amount) AS cgst_amount,
           SUM(item.sgst_amount) AS sgst_amount, SUM(item.igst_amount) AS igst_amount,
           GROUP_CONCAT(DISTINCT item.tax_rate ORDER BY item.tax_rate SEPARATOR ',') AS tax_rates
    FROM billing_purchases purchase
    INNER JOIN billing_purchase_items item ON item.purchase_id=purchase.id
    INNER JOIN core_contacts contact ON contact.id=purchase.supplier_id
    WHERE purchase.company_id=${companyId} AND purchase.financial_year_id=${financialYearId}
      AND purchase.status='confirmed' AND purchase.deleted_at IS NULL
      AND purchase.purchase_date BETWEEN ${from} AND ${to}
    GROUP BY purchase.id, purchase.purchase_number, purchase.purchase_date,
             contact.gstin, contact.name, purchase.amount
    ORDER BY purchase.purchase_date, purchase.purchase_number
  `;
}

function salesHsn(companyId: number, from: string, to: string) {
  const { financialYearId } = currentBillingScope();
  return sql<HsnRow>`
    SELECT movement.hsn_code, movement.product_name,
           SUM(movement.quantity) AS total_quantity,
           SUM(movement.taxable_amount) AS taxable_amount,
           SUM(movement.cgst_amount) AS cgst_amount,
           SUM(movement.sgst_amount) AS sgst_amount,
           SUM(movement.igst_amount) AS igst_amount
    FROM (
      SELECT COALESCE(hsn.code,'') AS hsn_code,
             COALESCE(product.name, NULLIF(TRIM(item.description),''), 'Unmapped product') AS product_name,
             item.quantity, item.taxable_amount, item.cgst_amount, item.sgst_amount, item.igst_amount
      FROM billing_sales sale
      INNER JOIN billing_sales_items item ON item.sales_id=sale.id
      LEFT JOIN core_products product ON product.id=item.product_id
      LEFT JOIN core_hsn_codes hsn ON hsn.id=item.hsn_code_id
      WHERE sale.company_id=${companyId} AND sale.financial_year_id=${financialYearId}
        AND sale.status='confirmed' AND sale.deleted_at IS NULL
        AND sale.issued_on BETWEEN ${from} AND ${to}
      UNION ALL
      SELECT COALESCE(hsn.code,''),
             COALESCE(product.name, NULLIF(TRIM(item.description),''), 'Unmapped product'),
             item.quantity, item.taxable_amount, item.cgst_amount, item.sgst_amount, item.igst_amount
      FROM billing_export_sales sale
      INNER JOIN billing_export_sales_items item ON item.export_sale_id=sale.id
      LEFT JOIN core_products product ON product.id=item.product_id
      LEFT JOIN core_hsn_codes hsn ON hsn.id=item.hsn_code_id
      WHERE sale.company_id=${companyId} AND sale.financial_year_id=${financialYearId}
        AND sale.status='confirmed' AND sale.deleted_at IS NULL
        AND sale.issued_on BETWEEN ${from} AND ${to}
    ) movement
    GROUP BY movement.hsn_code, movement.product_name
    ORDER BY movement.hsn_code, movement.product_name
  `;
}

function purchaseHsn(companyId: number, from: string, to: string) {
  const { financialYearId } = currentBillingScope();
  return sql<HsnRow>`
    SELECT COALESCE(hsn.code,'') AS hsn_code,
           COALESCE(product.name, NULLIF(TRIM(item.description),''), 'Unmapped product') AS product_name,
           SUM(item.quantity) AS total_quantity,
           SUM(item.taxable_amount) AS taxable_amount,
           SUM(item.cgst_amount) AS cgst_amount,
           SUM(item.sgst_amount) AS sgst_amount,
           SUM(item.igst_amount) AS igst_amount
    FROM billing_purchases purchase
    INNER JOIN billing_purchase_items item ON item.purchase_id=purchase.id
    LEFT JOIN core_products product ON product.id=item.product_id
    LEFT JOIN core_hsn_codes hsn ON hsn.id=item.hsn_code_id
    WHERE purchase.company_id=${companyId} AND purchase.financial_year_id=${financialYearId}
      AND purchase.status='confirmed' AND purchase.deleted_at IS NULL
      AND purchase.purchase_date BETWEEN ${from} AND ${to}
    GROUP BY hsn_code, product_name
    ORDER BY hsn.code, product.name
  `;
}

function toDocument(row: DocumentRow, index: number): GstStatementDocument {
  return {
    cgstAmount: money(row.cgst_amount),
    contactName: row.contact_name,
    documentDate: row.document_date,
    documentNumber: row.document_number,
    documentType: row.document_type,
    gstin: row.gstin ?? "",
    igstAmount: money(row.igst_amount),
    invoiceTotal: money(row.invoice_total),
    serial: index + 1,
    sgstAmount: money(row.sgst_amount),
    taxableAmount: money(row.taxable_amount),
    taxRates: String(row.tax_rates ?? "")
      .split(",")
      .map(Number)
      .filter(Number.isFinite)
  };
}

function toHsnLine(row: HsnRow): GstStatementHsnLine {
  return {
    cgstAmount: money(row.cgst_amount),
    hsnCode: row.hsn_code || "Unmapped",
    igstAmount: money(row.igst_amount),
    productName: row.product_name,
    sgstAmount: money(row.sgst_amount),
    taxableAmount: money(row.taxable_amount),
    totalQuantity: quantity(row.total_quantity)
  };
}

function panelSummary(
  documents: GstStatementDocument[],
  hsn: GstStatementHsnLine[]
): GstStatementPanel {
  const totals = documents.reduce(
    (total, row) => ({
      cgstAmount: total.cgstAmount + row.cgstAmount,
      igstAmount: total.igstAmount + row.igstAmount,
      invoiceTotal: total.invoiceTotal + row.invoiceTotal,
      sgstAmount: total.sgstAmount + row.sgstAmount,
      taxableAmount: total.taxableAmount + row.taxableAmount
    }),
    { cgstAmount: 0, igstAmount: 0, invoiceTotal: 0, sgstAmount: 0, taxableAmount: 0 }
  );
  return {
    cgstAmount: money(totals.cgstAmount),
    documentCount: documents.length,
    documents,
    hsn,
    igstAmount: money(totals.igstAmount),
    invoiceTotal: money(totals.invoiceTotal),
    sgstAmount: money(totals.sgstAmount),
    taxAmount: money(totals.cgstAmount + totals.sgstAmount + totals.igstAmount),
    taxableAmount: money(totals.taxableAmount)
  };
}

function toFiling(row: FilingRow | undefined): GstStatementFiling {
  return {
    gstr1Arn: row?.gstr1_arn ?? "",
    gstr1FiledOn: row?.gstr1_filed_on ?? null,
    gstr3bArn: row?.gstr3b_arn ?? "",
    gstr3bFiledOn: row?.gstr3b_filed_on ?? null,
    openingBalance: money(row?.opening_balance),
    updatedAt: row?.updated_at ?? null
  };
}

function money(value: string | number | null | undefined) {
  return Math.round(Number(value ?? 0) * 100) / 100;
}

function quantity(value: string | number | null | undefined) {
  return Math.round(Number(value ?? 0) * 10_000) / 10_000;
}
