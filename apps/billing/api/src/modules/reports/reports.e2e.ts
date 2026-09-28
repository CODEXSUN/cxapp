import { createConnection } from "mysql2/promise";
import { withBillingScope } from "../../auth/billing-scope.js";
import { closeAllBillingDatabases } from "../../database/billing-database.js";
import { env } from "../../env.js";
import { CustomerStatementService } from "./customer-statement/index.js";
import { CustomerSummaryService } from "./customer-summary/index.js";
import { GstStatementService } from "./gst-statement/index.js";
import { StockStatementService } from "./stock-statement/index.js";
import { SupplierStatementService } from "./supplier-statement/index.js";
import { SupplierSummaryService } from "./supplier-summary/index.js";

export async function runBillingReportsE2e() {
  const tenantDatabases = await registeredTenantDatabases();
  if (!tenantDatabases.length)
    throw new Error("Billing Reports E2E requires a registered tenant database.");
  const results = [];
  try {
    for (const databaseName of tenantDatabases.slice(0, 2)) {
      const scope = await billingScope(databaseName);
      const { customer, customerSummary, gst, stock, supplier, supplierSummary } =
        await withBillingScope(scope, async () => ({
          customer: await new CustomerStatementService().get(databaseName, {
            page: 1,
            pageSize: 20
          }),
          customerSummary: await new CustomerSummaryService().get(databaseName),
          gst: await new GstStatementService().get(databaseName, {}),
          stock: await new StockStatementService().get(databaseName, {
            page: 1,
            pageSize: 20,
            search: ""
          }),
          supplier: await new SupplierStatementService().get(databaseName, {
            page: 1,
            pageSize: 20
          }),
          supplierSummary: await new SupplierSummaryService().get(databaseName)
        }));
      assertReport(customer.from, customer.to, customer.total, "Customer Statement");
      assertReport(supplier.from, supplier.to, supplier.total, "Supplier Statement");
      assertSummary(customerSummary.total, "Customer Summary");
      assertSummary(supplierSummary.total, "Supplier Summary");
      assertReport(stock.from, stock.to, stock.total, "Stock Statement");
      assertReport(
        gst.from,
        gst.to,
        gst.sales.documentCount + gst.purchases.documentCount,
        "GST Statement"
      );
      results.push({
        customerRows: customer.items.length,
        customerSummaryRows: customerSummary.items.length,
        databaseName,
        gstRows: gst.sales.documents.length + gst.purchases.documents.length,
        stockRows: stock.items.length,
        supplierRows: supplier.items.length,
        supplierSummaryRows: supplierSummary.items.length
      });
    }
    return results;
  } finally {
    await closeAllBillingDatabases();
  }
}

async function billingScope(databaseName: string) {
  const connection = await createConnection({
    database: databaseName,
    host: env.DB_HOST,
    password: env.DB_PASSWORD,
    port: env.DB_PORT,
    user: env.DB_USER,
    connectTimeout: 5_000
  });
  try {
    const [rows] = await connection.query(
      "SELECT company_id, financial_year_id FROM core_default_company_settings WHERE status = 'active' LIMIT 1"
    );
    const scope = (rows as Array<{ company_id: number; financial_year_id: number }>)[0];
    if (!scope)
      throw new Error(`Billing Reports E2E requires an active company scope in ${databaseName}.`);
    return { companyId: scope.company_id, financialYearId: scope.financial_year_id };
  } finally {
    await connection.end();
  }
}

function assertSummary(total: number, label: string) {
  if (!Number.isInteger(total) || total < 0)
    throw new Error(`${label} returned an invalid row count.`);
}

async function registeredTenantDatabases() {
  const connection = await createConnection({
    database: env.DB_MASTER_NAME,
    host: env.DB_HOST,
    password: env.DB_PASSWORD,
    port: env.DB_PORT,
    user: env.DB_USER,
    connectTimeout: 5_000
  });
  try {
    const [rows] = await connection.query(
      "SELECT db_name FROM tenants WHERE db_name IS NOT NULL AND status <> 'deleted' ORDER BY id"
    );
    return (rows as Array<{ db_name: string }>).map((row) => row.db_name);
  } finally {
    await connection.end();
  }
}

function assertReport(from: string, to: string, total: number, label: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) {
    throw new Error(`${label} returned an invalid date range.`);
  }
  if (!Number.isInteger(total) || total < 0)
    throw new Error(`${label} returned an invalid row count.`);
}

if (import.meta.url === `file:///${process.argv[1]?.replaceAll("\\", "/")}`) {
  runBillingReportsE2e()
    .then((result) => console.log("Billing Reports E2E passed", result))
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
