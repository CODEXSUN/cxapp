import { sql } from "kysely";
import { AppError } from "@codexsun/framework/errors";
import { getBillingDatabase } from "../../database/billing-database.js";
import { currentBillingScope } from "../../auth/billing-scope.js";
import type {
  BillingDashboardSnapshot,
  DashboardMetric,
  DashboardMonthlyTotal,
  DashboardOutstandingContact,
  DashboardRecentTransaction,
  DashboardTransactionKind
} from "./dashboard.types.js";

type ContextRow = {
  company_id: number;
  company_name: string;
  financial_year_end: string;
  financial_year_id: number;
  financial_year_name: string;
  financial_year_start: string;
};

type MetricRow = {
  count_value: string | number;
  financial_year_value: string | number;
  kind: DashboardTransactionKind;
  month_value: string | number;
  total_value: string | number;
};

type MonthlyRow = {
  amount: string | number;
  kind: DashboardTransactionKind;
  month_start: string;
};

type RecentRow = {
  amount: string | number;
  contact_name: string;
  document_date: string;
  document_id: string;
  document_number: string;
  kind: DashboardRecentTransaction["kind"];
  status: string;
};

type OutstandingRow = {
  contact_id: number;
  contact_name: string;
  credit_limit: string | number;
  direction: DashboardOutstandingContact["direction"];
  gross_amount: string | number;
  outstanding_amount: string | number;
  settled_amount: string | number;
};

export class DashboardRepository {
  async context(databaseName: string, companyId?: number) {
    const database = await getBillingDatabase(databaseName);
    const scope = currentBillingScope();
    const result = await sql<ContextRow>`
      SELECT c.id AS company_id, c.name AS company_name, f.id AS financial_year_id,
             f.name AS financial_year_name, DATE_FORMAT(f.start_date, '%Y-%m-%d') AS financial_year_start,
             DATE_FORMAT(f.end_date, '%Y-%m-%d') AS financial_year_end
      FROM companies c CROSS JOIN financial_years f
      WHERE c.id=${scope.companyId} AND c.status='active'
        AND f.id=${scope.financialYearId} AND f.status='active'
        ${companyId ? sql`AND c.id=${companyId}` : sql``}
      LIMIT 1
    `.execute(database);
    return result.rows[0] ?? null;
  }

  async contexts(databaseName: string) {
    const database = await getBillingDatabase(databaseName);
    const result = await sql<{ company_id: number; financial_year_id: number }>`
      SELECT company_id, financial_year_id FROM default_company_settings WHERE status='active'
      UNION
      SELECT company_id, financial_year_id FROM billing_sales WHERE deleted_at IS NULL
      UNION
      SELECT company_id, financial_year_id FROM billing_purchases WHERE deleted_at IS NULL
      UNION
      SELECT company_id, financial_year_id FROM billing_export_sales WHERE deleted_at IS NULL
      UNION
      SELECT company_id, financial_year_id FROM billing_receipts WHERE deleted_at IS NULL
      UNION
      SELECT company_id, financial_year_id FROM billing_payments WHERE deleted_at IS NULL
    `.execute(database);
    return result.rows;
  }

  async get(databaseName: string, companyId: number, financialYearId: number) {
    const database = await getBillingDatabase(databaseName);
    const result = await sql<{ snapshot_json: BillingDashboardSnapshot | string }>`
      SELECT snapshot_json FROM billing_dashboard_snapshots
      WHERE company_id=${companyId} AND financial_year_id=${financialYearId} LIMIT 1
    `.execute(database);
    const value = result.rows[0]?.snapshot_json;
    if (!value) return null;
    return typeof value === "string" ? (JSON.parse(value) as BillingDashboardSnapshot) : value;
  }

  async rebuild(
    databaseName: string,
    companyId: number,
    financialYearId: number,
    lastEventName = "billing.dashboard.bootstrap"
  ) {
    const database = await getBillingDatabase(databaseName);
    const contextResult = await sql<ContextRow>`
      SELECT c.id AS company_id, c.name AS company_name, f.id AS financial_year_id,
             f.name AS financial_year_name, DATE_FORMAT(f.start_date, '%Y-%m-%d') AS financial_year_start,
             DATE_FORMAT(f.end_date, '%Y-%m-%d') AS financial_year_end
      FROM companies c CROSS JOIN financial_years f
      WHERE c.id=${companyId} AND f.id=${financialYearId} AND c.status='active' AND f.status='active'
      LIMIT 1
    `.execute(database);
    const context = contextResult.rows[0];
    if (!context) throw AppError.validation("Dashboard Company or Financial Year is inactive.");

    const [metricResult, monthlyResult, recentResult, outstandingResult] = await Promise.all([
      metricQuery(database, companyId, financialYearId),
      monthlyQuery(database, companyId, financialYearId),
      recentQuery(database, companyId, financialYearId),
      outstandingQuery(database, companyId, financialYearId)
    ]);
    const projectedAt = new Date().toISOString();
    const snapshot: BillingDashboardSnapshot = {
      companyId,
      companyName: context.company_name,
      financialYearEnd: context.financial_year_end,
      financialYearId,
      financialYearName: context.financial_year_name,
      financialYearStart: context.financial_year_start,
      metrics: metrics(metricResult.rows),
      monthly: monthly(
        context.financial_year_start,
        context.financial_year_end,
        monthlyResult.rows
      ),
      outstanding: outstandingResult.rows.map((row) => ({
        contactId: Number(row.contact_id),
        contactName: row.contact_name,
        creditLimit: money(row.credit_limit),
        direction: row.direction,
        grossAmount: money(row.gross_amount),
        outstandingAmount: money(row.outstanding_amount),
        overLimit:
          money(row.credit_limit) > 0 && money(row.outstanding_amount) > money(row.credit_limit),
        settledAmount: money(row.settled_amount)
      })),
      projectedAt,
      projectionVersion: 1,
      recent: recentResult.rows.map((row) => ({
        amount: money(row.amount),
        contactName: row.contact_name,
        date: row.document_date,
        documentId: row.document_id,
        documentNumber: row.document_number,
        kind: row.kind,
        status: row.status
      }))
    };
    await sql`
      INSERT INTO billing_dashboard_snapshots
        (company_id, financial_year_id, projection_version, snapshot_json, last_event_name, projected_at)
      VALUES (${companyId}, ${financialYearId}, 1, ${JSON.stringify(snapshot)}, ${lastEventName}, ${projectedAt.slice(0, 23).replace("T", " ")})
      ON DUPLICATE KEY UPDATE projection_version=VALUES(projection_version), snapshot_json=VALUES(snapshot_json),
        last_event_name=VALUES(last_event_name), projected_at=VALUES(projected_at)
    `.execute(database);
    return snapshot;
  }
}

function metricQuery(
  database: Awaited<ReturnType<typeof getBillingDatabase>>,
  companyId: number,
  financialYearId: number
) {
  return sql<MetricRow>`
    SELECT kind, SUM(amount) AS total_value,
      SUM(amount) AS financial_year_value,
      SUM(CASE WHEN YEAR(tx_date)=YEAR(CURRENT_DATE()) AND MONTH(tx_date)=MONTH(CURRENT_DATE()) THEN amount ELSE 0 END) AS month_value,
      COUNT(*) AS count_value
    FROM (
      SELECT 'sales' kind, company_id, financial_year_id, issued_on tx_date, amount FROM billing_sales WHERE status='confirmed' AND deleted_at IS NULL
      UNION ALL SELECT 'sales', company_id, financial_year_id, issued_on, amount FROM billing_export_sales WHERE status='confirmed' AND deleted_at IS NULL
      UNION ALL SELECT 'purchase', company_id, financial_year_id, purchase_date, amount FROM billing_purchases WHERE status='confirmed' AND deleted_at IS NULL
      UNION ALL SELECT 'receipt', company_id, financial_year_id, receipt_date, total_amount FROM billing_receipts WHERE status='posted' AND deleted_at IS NULL
      UNION ALL SELECT 'payment', company_id, financial_year_id, payment_date, total_amount FROM billing_payments WHERE status='posted' AND deleted_at IS NULL
    ) transaction_values WHERE company_id=${companyId} AND financial_year_id=${financialYearId} GROUP BY kind
  `.execute(database);
}

function monthlyQuery(
  database: Awaited<ReturnType<typeof getBillingDatabase>>,
  companyId: number,
  financialYearId: number
) {
  return sql<MonthlyRow>`
    SELECT kind, DATE_FORMAT(tx_date, '%Y-%m-01') month_start, SUM(amount) amount FROM (
      SELECT 'sales' kind, issued_on tx_date, amount FROM billing_sales WHERE company_id=${companyId} AND financial_year_id=${financialYearId} AND status='confirmed' AND deleted_at IS NULL
      UNION ALL SELECT 'sales', issued_on, amount FROM billing_export_sales WHERE company_id=${companyId} AND financial_year_id=${financialYearId} AND status='confirmed' AND deleted_at IS NULL
      UNION ALL SELECT 'purchase', purchase_date, amount FROM billing_purchases WHERE company_id=${companyId} AND financial_year_id=${financialYearId} AND status='confirmed' AND deleted_at IS NULL
      UNION ALL SELECT 'receipt', receipt_date, total_amount FROM billing_receipts WHERE company_id=${companyId} AND financial_year_id=${financialYearId} AND status='posted' AND deleted_at IS NULL
      UNION ALL SELECT 'payment', payment_date, total_amount FROM billing_payments WHERE company_id=${companyId} AND financial_year_id=${financialYearId} AND status='posted' AND deleted_at IS NULL
    ) transaction_values GROUP BY kind, DATE_FORMAT(tx_date, '%Y-%m-01')
  `.execute(database);
}

function recentQuery(
  database: Awaited<ReturnType<typeof getBillingDatabase>>,
  companyId: number,
  financialYearId: number
) {
  return sql<RecentRow>`
    SELECT kind, document_id, document_number, contact_name, document_date, amount, status FROM (
      SELECT 'sales' kind, s.uuid document_id, s.invoice_number document_number, c.name contact_name, DATE_FORMAT(s.issued_on, '%Y-%m-%d') document_date, s.amount, s.status, s.updated_at
        FROM billing_sales s INNER JOIN contacts c ON c.id=s.customer_id WHERE s.company_id=${companyId} AND s.financial_year_id=${financialYearId} AND s.deleted_at IS NULL
      UNION ALL SELECT 'export-sales', s.uuid, s.invoice_number, c.name, DATE_FORMAT(s.issued_on, '%Y-%m-%d'), s.amount, s.status, s.updated_at
        FROM billing_export_sales s INNER JOIN contacts c ON c.id=s.customer_id WHERE s.company_id=${companyId} AND s.financial_year_id=${financialYearId} AND s.deleted_at IS NULL
      UNION ALL SELECT 'purchase', p.uuid, p.purchase_number, c.name, DATE_FORMAT(p.purchase_date, '%Y-%m-%d'), p.amount, p.status, p.updated_at
        FROM billing_purchases p INNER JOIN contacts c ON c.id=p.supplier_id WHERE p.company_id=${companyId} AND p.financial_year_id=${financialYearId} AND p.deleted_at IS NULL
      UNION ALL SELECT 'receipt', r.uuid, r.receipt_number, c.name, DATE_FORMAT(r.receipt_date, '%Y-%m-%d'), r.total_amount, r.status, r.updated_at
        FROM billing_receipts r INNER JOIN contacts c ON c.id=r.customer_id WHERE r.company_id=${companyId} AND r.financial_year_id=${financialYearId} AND r.deleted_at IS NULL
      UNION ALL SELECT 'payment', p.uuid, p.payment_number, c.name, DATE_FORMAT(p.payment_date, '%Y-%m-%d'), p.total_amount, p.status, p.updated_at
        FROM billing_payments p INNER JOIN contacts c ON c.id=p.supplier_id WHERE p.company_id=${companyId} AND p.financial_year_id=${financialYearId} AND p.deleted_at IS NULL
    ) recent_values ORDER BY updated_at DESC LIMIT 12
  `.execute(database);
}

function outstandingQuery(
  database: Awaited<ReturnType<typeof getBillingDatabase>>,
  companyId: number,
  financialYearId: number
) {
  return sql<OutstandingRow>`
    SELECT direction, contact_id, contact_name, credit_limit, SUM(gross_amount) gross_amount,
      SUM(settled_amount) settled_amount, GREATEST(SUM(gross_amount)-SUM(settled_amount), 0) outstanding_amount
    FROM (
      SELECT 'receivable' direction, c.id contact_id, c.name contact_name, c.credit_limit,
        SUM(s.amount) gross_amount, SUM(COALESCE(a.allocated_amount,0)) settled_amount
      FROM billing_sales s INNER JOIN contacts c ON c.id=s.customer_id
      LEFT JOIN (
        SELECT a.sales_id, SUM(a.allocated_amount) allocated_amount FROM billing_receipt_allocations a
        INNER JOIN billing_receipts r ON r.id=a.receipt_id
          AND r.company_id=${companyId} AND r.financial_year_id=${financialYearId}
          AND r.status='posted' AND r.deleted_at IS NULL GROUP BY a.sales_id
      ) a ON a.sales_id=s.id
      WHERE s.company_id=${companyId} AND s.financial_year_id=${financialYearId} AND s.status='confirmed' AND s.deleted_at IS NULL
      GROUP BY c.id, c.name, c.credit_limit
      UNION ALL
      SELECT 'receivable', c.id, c.name, c.credit_limit, SUM(s.amount), 0
      FROM billing_export_sales s INNER JOIN contacts c ON c.id=s.customer_id
      WHERE s.company_id=${companyId} AND s.financial_year_id=${financialYearId} AND s.status='confirmed' AND s.deleted_at IS NULL
      GROUP BY c.id, c.name, c.credit_limit
      UNION ALL
      SELECT 'payable', c.id, c.name, c.credit_limit, SUM(p.amount), SUM(COALESCE(a.allocated_amount,0))
      FROM billing_purchases p INNER JOIN contacts c ON c.id=p.supplier_id
      LEFT JOIN (
        SELECT a.purchase_id, SUM(a.allocated_amount) allocated_amount FROM billing_payment_allocations a
        INNER JOIN billing_payments p ON p.id=a.payment_id
          AND p.company_id=${companyId} AND p.financial_year_id=${financialYearId}
          AND p.status='posted' AND p.deleted_at IS NULL GROUP BY a.purchase_id
      ) a ON a.purchase_id=p.id
      WHERE p.company_id=${companyId} AND p.financial_year_id=${financialYearId} AND p.status='confirmed' AND p.deleted_at IS NULL
      GROUP BY c.id, c.name, c.credit_limit
    ) balances GROUP BY direction, contact_id, contact_name, credit_limit
    HAVING outstanding_amount > 0 ORDER BY outstanding_amount DESC LIMIT 12
  `.execute(database);
}

function metrics(rows: MetricRow[]): BillingDashboardSnapshot["metrics"] {
  const empty = (): DashboardMetric => ({ count: 0, financialYear: 0, month: 0, total: 0 });
  const result = { payment: empty(), purchase: empty(), receipt: empty(), sales: empty() };
  for (const row of rows)
    result[row.kind] = {
      count: Number(row.count_value),
      financialYear: money(row.financial_year_value),
      month: money(row.month_value),
      total: money(row.total_value)
    };
  return result;
}

function monthly(start: string, end: string, rows: MonthlyRow[]): DashboardMonthlyTotal[] {
  const values = new Map(rows.map((row) => [`${row.month_start}:${row.kind}`, money(row.amount)]));
  const cursor = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  const result: DashboardMonthlyTotal[] = [];
  while (cursor <= last && result.length < 24) {
    const month = cursor.toISOString().slice(0, 7) + "-01";
    result.push({
      label: cursor.toLocaleString("en-IN", { month: "short", timeZone: "UTC" }),
      month,
      payment: values.get(`${month}:payment`) ?? 0,
      purchase: values.get(`${month}:purchase`) ?? 0,
      receipt: values.get(`${month}:receipt`) ?? 0,
      sales: values.get(`${month}:sales`) ?? 0
    });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return result;
}

function money(value: string | number) {
  return Math.round(Number(value ?? 0) * 100) / 100;
}
