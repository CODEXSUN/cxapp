import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { createConnection, type RowDataPacket } from "mysql2/promise";
import {
  bootstrapBillingDatabase,
  closeAllBillingDatabases
} from "../../database/billing-database.js";
import { env } from "../../env.js";
import { withBillingScope } from "../../auth/billing-scope.js";
import { QuotationService } from "./quotation.service.js";

export async function runQuotationE2e() {
  const databaseName = `codexsun_quotation_e2e_${Date.now()}`;
  let admin = await createConnection({
    host: env.DB_HOST,
    password: env.DB_PASSWORD,
    port: env.DB_PORT,
    user: env.DB_USER
  });
  try {
    await admin.query(
      `CREATE DATABASE \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await admin.end();
    admin = await createConnection({
      database: databaseName,
      host: env.DB_HOST,
      password: env.DB_PASSWORD,
      port: env.DB_PORT,
      user: env.DB_USER
    });
    for (const statement of parentSchema) await admin.query(statement);
    for (const statement of parentRecords) await admin.query(statement);
    const [parentTableRows] = await admin.query<Array<RowDataPacket & { count: number }>>(
      "SELECT COUNT(*) AS count FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()"
    );
    assert.ok(Number(parentTableRows[0]?.count ?? 0) >= parentSchema.length);

    await bootstrapBillingDatabase(databaseName);
    const service = new QuotationService();
    return withBillingScope({ companyId: 1, financialYearId: 1 }, async () => {
    const context = await service.getContext(databaseName);
    assert.equal(context.companyId, 1);
    assert.equal(context.currencyCode, "INR");

    const payload = {
      billingAddress: "1 Test Street",
      billingAddressId: 1,
      companyId: 1,
      currencyCode: "INR",
      currencyId: 1,
      customerEmail: "customer@example.test",
      customerId: 1,
      customerName: "E2E Customer",
      customerPhone: "9000000000",
      date: "2026-07-13",
      financialYearId: 1,
      items: [
        {
          colour: "Blue",
          colourId: 1,
          dcNo: "DC-1",
          description: "",
          hsnCode: "6109",
          hsnCodeId: 1,
          poNo: "PO-1",
          productId: 1,
          productName: "E2E Product",
          quantity: 2,
          rate: 100,
          size: "M",
          sizeId: 1,
          taxId: 1,
          taxRate: 18,
          unit: "Nos",
          unitId: 1
        }
      ],
      ledgerId: 1,
      notes: "Quotation relational E2E",
      quotationNumber: "QT-E2E-001",
      roundOff: 0,
      salesLedger: "Sales",
      shippingAddress: "1 Test Street",
      shippingAddressId: 1,
      status: "draft" as const,
      taxType: "cgst-sgst" as const,
      terms: "Valid for 30 days",
      workOrderId: 1,
      workOrderNo: "WO-1"
    };

    const created = await service.create(databaseName, payload);
    assert.match(created.id, /^[0-9a-f]{8}$/);
    assert.equal(created.items[0]?.productId, 1);
    assert.equal(created.items[0]?.description, "");
    assert.equal(created.amount, 236);
    assert.equal(created.customerGstin, "33ABCDE1234F1Z5");
    assert.equal(created.billingStateName, "Tamil Nadu");
    assert.equal(created.billingStateCode, "33");
    assert.equal((await service.list(databaseName)).length, 1);
    assert.equal((await service.get(databaseName, created.id))?.customerId, 1);

    await admin.query("UPDATE contacts SET gstin='29ABCDE1234F1Z5' WHERE id=1");
    await admin.query(
      "UPDATE contacts_addresses SET state_id=2,state_name='Karnataka',city_name='Bengaluru' WHERE id=1"
    );
    const updated = await service.update(databaseName, created.id, {
      ...payload,
      notes: "Updated quotation address"
    });
    assert.equal(updated?.customerGstin, "29ABCDE1234F1Z5");
    assert.equal(updated?.billingStateName, "Karnataka");
    assert.equal(updated?.billingStateCode, "29");
    assert.equal(updated?.shippingStateName, "Karnataka");
    assert.equal(updated?.shippingStateCode, "29");

    assert.equal((await service.confirm(databaseName, created.id))?.status, "confirmed");
    assert.equal((await service.revoke(databaseName, created.id))?.status, "draft");
    assert.equal((await service.cancel(databaseName, created.id))?.status, "cancelled");
    assert.equal((await service.revoke(databaseName, created.id))?.status, "draft");
    assert.equal((await service.deleteDraft(databaseName, created.id))?.id, created.id);
    assert.equal(await service.get(databaseName, created.id), null);

    const convertible = await service.create(databaseName, {
      ...payload,
      quotationNumber: "QT-E2E-002"
    });
    const conversion = await service.convertToSale(databaseName, convertible.id);
    assert.ok(conversion);
    assert.match(conversion.sale.id, /^[0-9a-f]{8}$/);
    assert.equal(conversion.quotation.generatedSalesInvoiceNo, conversion.sale.invoiceNumber);

    const [activityRows] = await admin.query<Array<RowDataPacket & { count: number }>>(
      "SELECT COUNT(*) AS count FROM billing_quotation_activities"
    );
    assert.ok(Number(activityRows[0]?.count ?? 0) >= 8);
    const [complianceTables] = await admin.query<Array<RowDataPacket & { count: number }>>(
      "SELECT COUNT(*) AS count FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('billing_quotation_eway_bills', 'billing_quotation_einvoices')"
    );
    assert.equal(Number(complianceTables[0]?.count ?? 0), 0);

    await assert.rejects(
      service.create(databaseName, {
        ...payload,
        date: "2027-04-01",
        quotationNumber: "QT-OUTSIDE-YEAR"
      }),
      /outside the selected active Financial Year/
    );
    await admin.query("INSERT INTO companies VALUES (2, 'Other Company', 'active')");
    await admin.query(
      "INSERT INTO financial_years VALUES (2, '2027-28', '2027-04-01', '2028-03-31', 'active')"
    );
    const otherScopeQuotation = await withBillingScope(
      { companyId: 2, financialYearId: 2 },
      () =>
        service.create(databaseName, {
          ...payload,
          companyId: 2,
          date: "2027-04-01",
          financialYearId: 2,
          quotationNumber: "QT-OTHER-SCOPE"
        })
    );
    assert.equal(await service.get(databaseName, otherScopeQuotation.id), null);
    assert.equal((await service.list(databaseName)).some((item) => item.id === otherScopeQuotation.id), false);
    return { databaseName, quotationId: convertible.id, saleId: conversion.sale.id };
    });
  } finally {
    try {
      await closeAllBillingDatabases();
    } finally {
      await admin.end();
      const cleanup = await createConnection({
        database: env.DB_MASTER_NAME,
        host: env.DB_HOST,
        password: env.DB_PASSWORD,
        port: env.DB_PORT,
        user: env.DB_USER
      });
      await cleanup.query(`DROP DATABASE IF EXISTS \`${databaseName}\``);
      await cleanup.end();
    }
  }
}

const parentSchema = [
  "CREATE TABLE schema_migrations (id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, name VARCHAR(160) NOT NULL UNIQUE, applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)",
  "CREATE TABLE companies (id INT PRIMARY KEY, name VARCHAR(180) NOT NULL, status VARCHAR(24) NOT NULL)",
  "CREATE TABLE financial_years (id INT PRIMARY KEY, name VARCHAR(180) NOT NULL, start_date DATE NOT NULL, end_date DATE NOT NULL, status VARCHAR(24) NOT NULL)",
  "CREATE TABLE contacts (id INT PRIMARY KEY, name VARCHAR(180) NOT NULL, legal_name VARCHAR(180) NULL, primary_email VARCHAR(180) NULL, primary_phone VARCHAR(40) NULL, gstin VARCHAR(40) NULL, credit_limit DECIMAL(14,2) NOT NULL DEFAULT 0, status VARCHAR(24) NOT NULL)",
  "CREATE TABLE states (id INT PRIMARY KEY, code VARCHAR(80) NOT NULL, name VARCHAR(180) NOT NULL)",
  "CREATE TABLE contacts_addresses (id INT PRIMARY KEY, parent_id INT NOT NULL, address_line1 VARCHAR(255) NOT NULL, address_line2 VARCHAR(255) NULL, city_name VARCHAR(120) NULL, district_name VARCHAR(120) NULL, state_id INT NULL, state_name VARCHAR(120) NULL, pincode_name VARCHAR(24) NULL, country_name VARCHAR(120) NULL)",
  "CREATE TABLE work_orders (id INT PRIMARY KEY, code VARCHAR(120) NOT NULL, name VARCHAR(180) NULL, status VARCHAR(24) NOT NULL)",
  "CREATE TABLE ledgers (id INT PRIMARY KEY, name VARCHAR(180) NOT NULL, status VARCHAR(24) NOT NULL)",
  "CREATE TABLE currencies (id INT PRIMARY KEY, name VARCHAR(24) NOT NULL, status VARCHAR(24) NOT NULL)",
  "CREATE TABLE users (id INT PRIMARY KEY)",
  "CREATE TABLE products (id INT PRIMARY KEY, name VARCHAR(180) NOT NULL, hsn_code_id INT NULL, gst_tax_id INT NULL, unit_id INT NULL, status VARCHAR(24) NOT NULL, deleted_at DATETIME(3) NULL)",
  "CREATE TABLE hsn_codes (id INT PRIMARY KEY, code VARCHAR(40) NOT NULL, status VARCHAR(24) NOT NULL)",
  "CREATE TABLE colours (id INT PRIMARY KEY, name VARCHAR(120) NOT NULL, status VARCHAR(24) NOT NULL)",
  "CREATE TABLE sizes (id INT PRIMARY KEY, name VARCHAR(120) NOT NULL, status VARCHAR(24) NOT NULL)",
  "CREATE TABLE units (id INT PRIMARY KEY, name VARCHAR(120) NOT NULL, status VARCHAR(24) NOT NULL)",
  "CREATE TABLE taxes (id INT PRIMARY KEY, name VARCHAR(120) NOT NULL, status VARCHAR(24) NOT NULL)",
  "CREATE TABLE transports (id INT PRIMARY KEY, name VARCHAR(180) NOT NULL, gst VARCHAR(40) NULL, status VARCHAR(24) NOT NULL)",
  "CREATE TABLE default_company_settings (singleton_key INT PRIMARY KEY, company_id INT NOT NULL, financial_year_id INT NOT NULL, status VARCHAR(24) NOT NULL)"
];

const parentRecords = [
  "INSERT INTO companies VALUES (1, 'E2E Company', 'active')",
  "INSERT INTO financial_years VALUES (1, '2026-27', '2026-04-01', '2027-03-31', 'active')",
  "INSERT INTO contacts VALUES (1, 'E2E Customer', 'E2E Customer', 'customer@example.test', '9000000000', '33ABCDE1234F1Z5', 0, 'active')",
  "INSERT INTO states VALUES (1, '33', 'Tamil Nadu'), (2, '29', 'Karnataka')",
  "INSERT INTO contacts_addresses VALUES (1, 1, '1 Test Street', NULL, 'Chennai', 'Chennai', 1, 'Tamil Nadu', '600001', 'India')",
  "INSERT INTO work_orders VALUES (1, 'WO-1', 'E2E Work Order', 'active')",
  "INSERT INTO ledgers VALUES (1, 'Sales', 'active')",
  "INSERT INTO currencies VALUES (1, 'INR', 'active')",
  "INSERT INTO products VALUES (1, 'E2E Product', 1, 1, 1, 'active', NULL)",
  "INSERT INTO hsn_codes VALUES (1, '6109', 'active')",
  "INSERT INTO colours VALUES (1, 'Blue', 'active')",
  "INSERT INTO sizes VALUES (1, 'M', 'active')",
  "INSERT INTO units VALUES (1, 'Nos', 'active')",
  "INSERT INTO taxes VALUES (1, 'GST 18%', 'active')",
  "INSERT INTO transports VALUES (1, 'E2E Transport', '33AAAAA0000A1Z5', 'active')",
  "INSERT INTO default_company_settings VALUES (1, 1, 1, 'active')"
];

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runQuotationE2e()
    .then((result) => console.log("Quotation relational E2E passed", result))
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
