import { createConnection } from "mysql2/promise";
import { closeAllBillingDatabases } from "../../database/billing-database.js";
import { env } from "../../env.js";
import { CustomerStatementService } from "./customer-statement/index.js";
import { GstStatementService } from "./gst-statement/index.js";
import { StockStatementService } from "./stock-statement/index.js";
import { SupplierStatementService } from "./supplier-statement/index.js";

export async function runBillingReportsE2e() {
  const tenantDatabases = await registeredTenantDatabases();
  if (!tenantDatabases.length)
    throw new Error("Billing Reports E2E requires a registered tenant database.");
  const results = [];
  try {
    for (const databaseName of tenantDatabases.slice(0, 2)) {
      const customer = await new CustomerStatementService().get(databaseName, {
        page: 1,
        pageSize: 20
      });
      const supplier = await new SupplierStatementService().get(databaseName, {
        page: 1,
        pageSize: 20
      });
      const stock = await new StockStatementService().get(databaseName, {
        page: 1,
        pageSize: 20,
        search: ""
      });
      const gst = await new GstStatementService().get(databaseName, {
        page: 1,
        pageSize: 20
      });
      assertReport(customer.from, customer.to, customer.total, "Customer Statement");
      assertReport(supplier.from, supplier.to, supplier.total, "Supplier Statement");
      assertReport(stock.from, stock.to, stock.total, "Stock Statement");
      assertReport(gst.from, gst.to, gst.total, "GST Statement");
      results.push({
        customerRows: customer.items.length,
        databaseName,
        gstRows: gst.items.length,
        stockRows: stock.items.length,
        supplierRows: supplier.items.length
      });
    }
    return results;
  } finally {
    await closeAllBillingDatabases();
  }
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
