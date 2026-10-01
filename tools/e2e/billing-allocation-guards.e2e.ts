import assert from "node:assert/strict";
import { Kysely, MysqlDialect, sql } from "kysely";
import { createPool } from "mysql2";
import { createConnection } from "mysql2/promise";
import { env } from "../../apps/billing/api/src/env.js";
import { runBillingTransaction } from "../../apps/billing/api/src/database/billing-database.js";
import { assertSaleHasNoAllocations } from "../../apps/billing/api/src/modules/sales/sales.allocation-guard.js";
import { assertPurchaseHasNoAllocations } from "../../apps/billing/api/src/modules/purchase/purchase.allocation-guard.js";
import { assertQuotationMutable } from "../../apps/billing/api/src/modules/quotation/quotation.lifecycle-guard.js";
import { assertLinkedSaleIdentity } from "../../apps/billing/api/src/modules/sales/sales.quotation-link-guard.js";

const databaseName = `cxapp_allocation_guard_e2e_${Date.now()}`;
const options = {
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD
};
const admin = await createConnection(options);
let database: Kysely<Record<string, never>> | undefined;
try {
  await admin.query(`CREATE DATABASE \`${databaseName}\``);
  database = new Kysely<Record<string, never>>({
    dialect: new MysqlDialect({
      pool: createPool({ ...options, database: databaseName, connectionLimit: 2 })
    })
  });
  for (const statement of [
    "CREATE TABLE billing_sales (id INT PRIMARY KEY, amount DECIMAL(14,2), invoice_number VARCHAR(80), company_id INT, financial_year_id INT, customer_id INT, currency_id INT) ENGINE=InnoDB",
    "CREATE TABLE billing_quotations (id INT PRIMARY KEY, generated_sales_invoice_no VARCHAR(80) NULL, company_id INT, financial_year_id INT, status VARCHAR(24), deleted_at DATETIME NULL) ENGINE=InnoDB",
    "CREATE TABLE billing_purchases (id INT PRIMARY KEY, amount DECIMAL(14,2)) ENGINE=InnoDB",
    "CREATE TABLE billing_receipts (id INT PRIMARY KEY, status VARCHAR(24), deleted_at DATETIME NULL) ENGINE=InnoDB",
    "CREATE TABLE billing_payments (id INT PRIMARY KEY, status VARCHAR(24), deleted_at DATETIME NULL) ENGINE=InnoDB",
    "CREATE TABLE billing_receipt_allocations (id INT PRIMARY KEY, sales_id INT, receipt_id INT, allocated_amount DECIMAL(14,2)) ENGINE=InnoDB",
    "CREATE TABLE billing_payment_allocations (id INT PRIMARY KEY, purchase_id INT, payment_id INT, allocated_amount DECIMAL(14,2)) ENGINE=InnoDB",
    "INSERT INTO billing_sales VALUES (1,100,'SAL-QA-1',1,1,1,1)",
    "INSERT INTO billing_quotations VALUES (1,NULL,1,1,'draft',NULL)",
    "INSERT INTO billing_purchases VALUES (1,100)",
    "INSERT INTO billing_receipts VALUES (1,'draft',NULL)",
    "INSERT INTO billing_payments VALUES (1,'draft',NULL)"
  ])
    await sql.raw(statement).execute(database);

  await runBillingTransaction(database, (transaction) =>
    assertQuotationMutable(transaction, 1, "draft")
  );
  await assert.rejects(
    runBillingTransaction(database, (transaction) =>
      assertQuotationMutable(transaction, 1, "confirmed")
    ),
    /status changed/
  );
  await sql`UPDATE billing_quotations SET generated_sales_invoice_no='SAL-QA-1' WHERE id=1`.execute(
    database
  );
  await assert.rejects(
    runBillingTransaction(database, (transaction) =>
      assertQuotationMutable(transaction, 1, "draft")
    ),
    /linked to an invoice/
  );
  await assert.rejects(
    runBillingTransaction(database, (transaction) => assertLinkedSaleIdentity(transaction, 1)),
    /cannot be deleted/
  );
  const identity = {
    invoiceNumber: "SAL-QA-1",
    companyId: 1,
    financialYearId: 1,
    customerId: 1,
    currencyId: 1
  };
  await runBillingTransaction(database, (transaction) =>
    assertLinkedSaleIdentity(transaction, 1, identity)
  );
  for (const change of [
    { invoiceNumber: "CHANGED" },
    { companyId: 2 },
    { financialYearId: 2 },
    { customerId: 2 },
    { currencyId: 2 }
  ]) {
    await assert.rejects(
      runBillingTransaction(database, (transaction) =>
        assertLinkedSaleIdentity(transaction, 1, { ...identity, ...change })
      ),
      /cannot be changed/
    );
  }
  // Identical invoice numbers belonging to another company must not create a link.
  await sql`UPDATE billing_quotations SET company_id=2 WHERE id=1`.execute(database);
  await runBillingTransaction(database, (transaction) => assertLinkedSaleIdentity(transaction, 1));
  console.log(
    "PASS: linked quotation immutability, stale status rejection, linked invoice identity/delete protection, company-scoped links."
  );

  for (const owner of ["sale", "purchase"] as const) {
    const guard = owner === "sale" ? assertSaleHasNoAllocations : assertPurchaseHasNoAllocations;
    const documentTable = owner === "sale" ? "billing_sales" : "billing_purchases";
    const settlementTable = owner === "sale" ? "billing_receipts" : "billing_payments";
    const allocationTable =
      owner === "sale" ? "billing_receipt_allocations" : "billing_payment_allocations";
    await runBillingTransaction(database, (transaction) => guard(transaction, 1));
    await sql.raw(`INSERT INTO ${allocationTable} VALUES (1,1,1,25)`).execute(database);
    for (const status of ["draft", "posted"]) {
      await sql`UPDATE ${sql.table(settlementTable)} SET status=${status}`.execute(database);
      await assert.rejects(
        runBillingTransaction(database, (transaction) => guard(transaction, 1)),
        /allocations/
      );
    }
    await sql`UPDATE ${sql.table(settlementTable)} SET status='cancelled'`.execute(database);
    await runBillingTransaction(database, (transaction) => guard(transaction, 1));
    await sql`UPDATE ${sql.table(settlementTable)} SET status='posted', deleted_at=NOW()`.execute(
      database
    );
    await runBillingTransaction(database, (transaction) => guard(transaction, 1));
    await assert.rejects(
      runBillingTransaction(database, async (transaction) => {
        await runBillingTransaction(transaction, async (nested) => {
          assert.equal(nested, transaction);
          await sql`UPDATE ${sql.table(documentTable)} SET amount=50`.execute(nested);
        });
        throw new Error("rollback probe");
      }),
      /rollback probe/
    );
    const result = await sql<{
      amount: string;
    }>`SELECT amount FROM ${sql.table(documentTable)}`.execute(database);
    assert.equal(Number(result.rows[0]?.amount), 100);
  }
  console.log(
    "PASS: sales/purchase allocation guards; draft/posted protection; cancelled/deleted release; nested transaction reuse and rollback."
  );
} finally {
  await database?.destroy();
  // Only the database created by this test is eligible for cleanup.
  assert.match(databaseName, /^cxapp_allocation_guard_e2e_\d+$/);
  await admin.query(`DROP DATABASE IF EXISTS \`${databaseName}\``);
  await admin.end();
}
