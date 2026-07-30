import { sql } from "kysely";
import { getBillingDatabase } from "../../../database/billing-database.js";
import { currentBillingScope } from "../../../auth/billing-scope.js";
import type { StockStatementLine } from "./stock-statement.types.js";

type ContextRow = {
  company_id: number;
  company_name: string;
  financial_year_end: string;
  financial_year_id: number;
  financial_year_name: string;
  financial_year_start: string;
};

type StockRow = {
  closing_quantity: string | number;
  hsn_code: string | null;
  inward_quantity: string | number;
  opening_quantity: string | number;
  outward_quantity: string | number;
  product_id: number;
  product_name: string;
  purchase_value: string | number;
  sales_value: string | number;
  unit_name: string | null;
};

export class StockStatementRepository {
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

  async count(databaseName: string, search: string) {
    const database = await getBillingDatabase(databaseName);
    const pattern = `%${search.trim()}%`;
    const result = await sql<{ total: number }>`
      SELECT COUNT(*) AS total FROM products product
      LEFT JOIN hsn_codes hsn ON hsn.id=product.hsn_code_id
      WHERE product.status='active' AND product.deleted_at IS NULL
        AND (${pattern}='%%' OR product.name LIKE ${pattern} OR COALESCE(hsn.code,'') LIKE ${pattern})
    `.execute(database);
    return Number(result.rows[0]?.total ?? 0);
  }

  async lines(
    databaseName: string,
    query: {
      companyId: number;
      from: string;
      page: number;
      pageSize: number;
      search: string;
      to: string;
    }
  ): Promise<StockStatementLine[]> {
    const database = await getBillingDatabase(databaseName);
    const offset = (query.page - 1) * query.pageSize;
    const result = await sql<StockRow>`
      ${stockRows(query.companyId, query.from, query.to, query.search)}
      ORDER BY product_name, product_id
      LIMIT ${query.pageSize} OFFSET ${offset}
    `.execute(database);
    return result.rows.map(toStockLine);
  }

  async summary(databaseName: string, companyId: number, from: string, to: string, search: string) {
    const database = await getBillingDatabase(databaseName);
    const result = await sql<{
      closing_quantity: string | number;
      inward_quantity: string | number;
      opening_quantity: string | number;
      outward_quantity: string | number;
      purchase_value: string | number;
      sales_value: string | number;
    }>`
      SELECT COALESCE(SUM(stock_values.opening_quantity),0) AS opening_quantity,
             COALESCE(SUM(stock_values.inward_quantity),0) AS inward_quantity,
             COALESCE(SUM(stock_values.outward_quantity),0) AS outward_quantity,
             COALESCE(SUM(stock_values.closing_quantity),0) AS closing_quantity,
             COALESCE(SUM(stock_values.purchase_value),0) AS purchase_value,
             COALESCE(SUM(stock_values.sales_value),0) AS sales_value
      FROM (${stockRows(companyId, from, to, search)}) stock_values
    `.execute(database);
    const row = result.rows[0];
    return {
      closingQuantity: quantity(row?.closing_quantity),
      inwardQuantity: quantity(row?.inward_quantity),
      openingQuantity: quantity(row?.opening_quantity),
      outwardQuantity: quantity(row?.outward_quantity),
      purchaseValue: money(row?.purchase_value),
      salesValue: money(row?.sales_value)
    };
  }
}

function stockRows(companyId: number, from: string, to: string, search: string) {
  const { financialYearId } = currentBillingScope();
  const pattern = `%${search.trim()}%`;
  return sql`
    SELECT product.id AS product_id, product.name AS product_name,
           COALESCE(hsn.code,'') AS hsn_code, COALESCE(unit.name,'') AS unit_name,
           product.opening_qty + COALESCE(SUM(movement.opening_delta),0) AS opening_quantity,
           COALESCE(SUM(movement.inward_quantity),0) AS inward_quantity,
           COALESCE(SUM(movement.outward_quantity),0) AS outward_quantity,
           product.opening_qty + COALESCE(SUM(movement.opening_delta),0)
             + COALESCE(SUM(movement.inward_quantity),0)
             - COALESCE(SUM(movement.outward_quantity),0) AS closing_quantity,
           COALESCE(SUM(movement.purchase_value),0) AS purchase_value,
           COALESCE(SUM(movement.sales_value),0) AS sales_value
    FROM products product
    LEFT JOIN hsn_codes hsn ON hsn.id=product.hsn_code_id
    LEFT JOIN units unit ON unit.id=product.unit_id
    LEFT JOIN (
      SELECT item.product_id,
        CASE WHEN purchase.purchase_date<${from} THEN item.quantity ELSE 0 END AS opening_delta,
        CASE WHEN purchase.purchase_date BETWEEN ${from} AND ${to} THEN item.quantity ELSE 0 END AS inward_quantity,
        0 AS outward_quantity,
        CASE WHEN purchase.purchase_date BETWEEN ${from} AND ${to} THEN item.taxable_amount ELSE 0 END AS purchase_value,
        0 AS sales_value
      FROM billing_purchase_items item
      INNER JOIN billing_purchases purchase ON purchase.id=item.purchase_id
      WHERE purchase.company_id=${companyId} AND purchase.financial_year_id=${financialYearId} AND purchase.status='confirmed'
        AND purchase.deleted_at IS NULL AND purchase.purchase_date<=${to}
      UNION ALL
      SELECT item.product_id,
        CASE WHEN sale.issued_on<${from} THEN -item.quantity ELSE 0 END,
        0,
        CASE WHEN sale.issued_on BETWEEN ${from} AND ${to} THEN item.quantity ELSE 0 END,
        0,
        CASE WHEN sale.issued_on BETWEEN ${from} AND ${to} THEN item.taxable_amount ELSE 0 END
      FROM billing_sales_items item
      INNER JOIN billing_sales sale ON sale.id=item.sales_id
      WHERE sale.company_id=${companyId} AND sale.financial_year_id=${financialYearId} AND sale.status='confirmed'
        AND sale.deleted_at IS NULL AND sale.issued_on<=${to}
      UNION ALL
      SELECT item.product_id,
        CASE WHEN sale.issued_on<${from} THEN -item.quantity ELSE 0 END,
        0,
        CASE WHEN sale.issued_on BETWEEN ${from} AND ${to} THEN item.quantity ELSE 0 END,
        0,
        CASE WHEN sale.issued_on BETWEEN ${from} AND ${to} THEN item.taxable_amount ELSE 0 END
      FROM billing_export_sales_items item
      INNER JOIN billing_export_sales sale ON sale.id=item.export_sale_id
      WHERE sale.company_id=${companyId} AND sale.financial_year_id=${financialYearId} AND sale.status='confirmed'
        AND sale.deleted_at IS NULL AND sale.issued_on<=${to}
    ) movement ON movement.product_id=product.id
    WHERE product.status='active' AND product.deleted_at IS NULL
      AND (${pattern}='%%' OR product.name LIKE ${pattern} OR COALESCE(hsn.code,'') LIKE ${pattern})
    GROUP BY product.id, product.name, product.opening_qty, hsn.code, unit.name
  `;
}

function toStockLine(row: StockRow): StockStatementLine {
  return {
    closingQuantity: quantity(row.closing_quantity),
    hsnCode: row.hsn_code ?? "",
    inwardQuantity: quantity(row.inward_quantity),
    openingQuantity: quantity(row.opening_quantity),
    outwardQuantity: quantity(row.outward_quantity),
    productId: Number(row.product_id),
    productName: row.product_name,
    purchaseValue: money(row.purchase_value),
    salesValue: money(row.sales_value),
    unitName: row.unit_name ?? ""
  };
}

function quantity(value: string | number | null | undefined) {
  return Math.round(Number(value ?? 0) * 10_000) / 10_000;
}

function money(value: string | number | null | undefined) {
  return Math.round(Number(value ?? 0) * 100) / 100;
}
