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
import { SalesService } from "../sales/index.js";
import { ReceiptService, assertExportInvoiceUnallocated } from "../receipt/index.js";
import { OpeningBalanceService, readOpeningBalanceOverrides } from "../opening-balance/index.js";
import {
  getBillingDatabase,
  migrateBillingTenantDatabase,
  type BillingDatabase
} from "../../database/billing-database.js";

export async function runQuotationE2e() {
  const databaseName = `cxapp_quotation_e2e_${Date.now()}`;
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
    for (const statement of parentSchema) await admin.query(`${statement} ENGINE=InnoDB`);
    for (const statement of parentRecords) await admin.query(statement);
    const [parentTableRows] = await admin.query<Array<RowDataPacket & { count: number }>>(
      "SELECT COUNT(*) AS count FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()"
    );
    assert.ok(Number(parentTableRows[0]?.count ?? 0) >= parentSchema.length);

    await bootstrapBillingDatabase(databaseName);
    const service = new QuotationService();
    return await withBillingScope({ companyId: 1, financialYearId: 1 }, async () => {
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

      await admin.query("UPDATE core_contacts SET gstin='29ABCDE1234F1Z5' WHERE id=1");
      await admin.query(
        "UPDATE core_contacts_addresses SET state_id=2,state_name='Karnataka',city_name='Bengaluru' WHERE id=1"
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
      await assert.rejects(service.convertToSale(databaseName, convertible.id), /already invoiced/);
      const [salesBefore] = await admin.query<Array<RowDataPacket & { count: number }>>(
        "SELECT COUNT(*) AS count FROM billing_sales"
      );
      const invoiceBefore = await new SalesService().getSale(databaseName, conversion.sale.id);
      const manual = await service.create(databaseName, {
        ...payload,
        quotationNumber: "QT-MANUAL-LINK",
        items: payload.items.map((item) => ({ ...item, quantity: 7, rate: 50 }))
      });
      const linked = await service.linkExistingInvoice(databaseName, manual.id, conversion.sale.id);
      assert.equal(linked.generatedSalesInvoiceNo, conversion.sale.invoiceNumber);
      assert.equal(
        (await service.linkExistingInvoice(databaseName, manual.id, conversion.sale.id)).id,
        manual.id
      );
      const invoiceAfter = await new SalesService().getSale(databaseName, conversion.sale.id);
      assert.deepEqual(
        invoiceAfter,
        invoiceBefore,
        "Manual linking must not modify any invoice field or item."
      );
      const [salesAfter] = await admin.query<Array<RowDataPacket & { count: number }>>(
        "SELECT COUNT(*) AS count FROM billing_sales"
      );
      assert.equal(
        salesAfter[0]?.count,
        salesBefore[0]?.count,
        "Manual linking must not create an invoice."
      );
      const concurrent = await service.create(databaseName, {
        ...payload,
        quotationNumber: "QT-CONCURRENT"
      });
      const attempts = await Promise.allSettled([
        service.convertToSale(databaseName, concurrent.id),
        service.convertToSale(databaseName, concurrent.id)
      ]);
      assert.equal(attempts.filter((attempt) => attempt.status === "fulfilled").length, 1);
      assert.equal(attempts.filter((attempt) => attempt.status === "rejected").length, 1);
      const [salesConcurrent] = await admin.query<Array<RowDataPacket & { count: number }>>(
        "SELECT COUNT(*) AS count FROM billing_sales"
      );
      assert.equal(Number(salesConcurrent[0]?.count), Number(salesAfter[0]?.count) + 1);
      await new SalesService().confirmSale(databaseName, conversion.sale.id);
      await admin.query("INSERT INTO core_currencies (id,name,status) VALUES (2,'USD','active')");
      const receipts = new ReceiptService();
      const receiptPayload = {
        allocations: [{ saleId: conversion.sale.id, allocatedAmount: 25 }],
        amount: 25,
        companyId: 1,
        currencyId: 1,
        customerId: 1,
        discountAmount: 0,
        financialYearId: 1,
        ledgerId: 1,
        notes: "Isolated allocation proof",
        receiptDate: "2026-10-01",
        receiptMode: "cash" as const,
        receiptNumber: "RCP-QA-1",
        referenceDate: "",
        referenceNo: "",
        roundOff: 0,
        tdsAmount: 0
      };
      await assert.rejects(
        receipts.create(databaseName, { ...receiptPayload, currencyId: 2 }),
        /allocations are invalid/
      );
      await assert.rejects(
        receipts.create(databaseName, {
          ...receiptPayload,
          allocations: [...receiptPayload.allocations, ...receiptPayload.allocations],
          amount: 50
        }),
        /only be allocated once/
      );
      const receipt = await receipts.create(databaseName, receiptPayload);
      assert.equal(receipt.allocatedAmount, 25);
      const candidates = await receipts.allocationCandidates(databaseName, 1);
      const candidate = candidates.find((item) => item.saleId === conversion.sale.id);
      assert.equal(candidate?.currencyId, 1);
      assert.equal(candidate?.outstandingAmount, conversion.sale.amount - 25);
      await assert.rejects(
        receipts.create(databaseName, {
          ...receiptPayload,
          receiptNumber: "RCP-OVER-ALLOC",
          amount: conversion.sale.amount,
          allocations: [{ saleId: conversion.sale.id, allocatedAmount: conversion.sale.amount }]
        }),
        /allocations are invalid/
      );
      await receipts.post(databaseName, receipt.id);
      await receipts.cancel(databaseName, receipt.id);
      const released = (await receipts.allocationCandidates(databaseName, 1)).find(
        (item) => item.saleId === conversion.sale.id
      );
      assert.equal(released?.outstandingAmount, conversion.sale.amount);

      await admin.query(`INSERT INTO billing_export_sales
        (uuid, company_id, financial_year_id, line_number, invoice_number, customer_id,
         billing_address_id, shipping_address_id, currency_id, issued_on, amount, status)
        VALUES ('eeff0011',1,1,1,'EXP-QA-1',1,1,1,1,'2026-10-01',100,'confirmed')`);
      const exportCandidate = (await receipts.allocationCandidates(databaseName, 1)).find(
        (item) => item.documentKind === "export-sale" && item.saleId === "eeff0011"
      );
      assert.equal(exportCandidate?.outstandingAmount, 100);
      const mixedPayload = {
        ...receiptPayload,
        receiptNumber: "RCP-MIXED",
        amount: 50,
        allocations: [
          { saleId: conversion.sale.id, allocatedAmount: 20 },
          { documentKind: "export-sale" as const, saleId: "eeff0011", allocatedAmount: 30 }
        ]
      };
      const mixed = await receipts.create(databaseName, mixedPayload);
      assert.equal(mixed.allocations.length, 2);
      assert.equal(
        mixed.allocations.find((item) => item.documentKind === "export-sale")?.allocatedAmount,
        30
      );
      const database = await getBillingDatabase(databaseName);
      const [exportRows] = await admin.query<Array<RowDataPacket & { id: number }>>(
        "SELECT id FROM billing_export_sales WHERE uuid='eeff0011'"
      );
      await assert.rejects(
        database
          .transaction()
          .execute((transaction) =>
            assertExportInvoiceUnallocated<BillingDatabase>(transaction, exportRows[0]!.id)
          ),
        /active receipt allocations/
      );
      await assert.rejects(
        receipts.create(databaseName, {
          ...mixedPayload,
          receiptNumber: "RCP-EXPORT-OVER",
          amount: 100,
          allocations: [{ documentKind: "export-sale", saleId: "eeff0011", allocatedAmount: 100 }]
        }),
        /allocations are invalid/
      );
      await receipts.post(databaseName, mixed.id);
      await receipts.cancel(databaseName, mixed.id);
      assert.equal(
        (await receipts.allocationCandidates(databaseName, 1)).find(
          (item) => item.documentKind === "export-sale" && item.saleId === "eeff0011"
        )?.outstandingAmount,
        100
      );
      await migrateBillingTenantDatabase(databaseName);
      assert.equal((await receipts.get(databaseName, mixed.id))?.allocations.length, 2);

      await admin.query(
        "ALTER TABLE core_contacts ADD COLUMN opening_balance DECIMAL(18,2) NOT NULL DEFAULT 0, ADD COLUMN deleted_at DATETIME NULL"
      );
      await admin.query("UPDATE core_contacts SET opening_balance=125 WHERE id=1");
      const openings = new OpeningBalanceService();
      const openingPayload = {
        contactId: 1,
        currencyId: 1,
        partyRole: "customer" as const,
        amount: 125,
        reason: "Reviewed legacy amount",
        assignLegacy: true
      };
      await assert.rejects(
        async () => openings.save(databaseName, openingPayload, "test:operator"),
        /Only Admin/
      );
      await withBillingScope(
        { companyId: 1, financialYearId: 1, canEditFinalizedEntries: true },
        async () => {
          await openings.save(databaseName, openingPayload, "test:operator");
          await openings.save(
            databaseName,
            { ...openingPayload, amount: 0, reason: "Reviewed zero correction" },
            "test:operator"
          );
          assert.equal((await readOpeningBalanceOverrides(databaseName, "customer")).get(1), 0);
          assert.equal((await openings.list(databaseName)).items.length, 1);
        }
      );
      await withBillingScope(
        { companyId: 2, financialYearId: 1, canEditFinalizedEntries: true },
        async () => {
          assert.equal((await readOpeningBalanceOverrides(databaseName, "customer")).get(1), 0);
        }
      );
      const [legacyRows] = await admin.query<Array<RowDataPacket & { opening_balance: number }>>(
        "SELECT opening_balance FROM core_contacts WHERE id=1"
      );
      assert.equal(Number(legacyRows[0]?.opening_balance), 125);
      const [auditRows] = await admin.query<Array<RowDataPacket & { count: number }>>(
        "SELECT COUNT(*) AS count FROM billing_opening_balance_activities"
      );
      assert.equal(Number(auditRows[0]?.count), 2);

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
      await admin.query("INSERT INTO core_companies VALUES (2, 'Other Company', 'active')");
      await admin.query(
        "INSERT INTO core_financial_years VALUES (2, '2027-28', '2027-04-01', '2028-03-31', 'active')"
      );
      const otherScopeQuotation = await withBillingScope({ companyId: 2, financialYearId: 2 }, () =>
        service.create(databaseName, {
          ...payload,
          companyId: 2,
          date: "2027-04-01",
          financialYearId: 2,
          quotationNumber: "QT-OTHER-SCOPE"
        })
      );
      assert.equal(await service.get(databaseName, otherScopeQuotation.id), null);
      assert.equal(
        (await service.list(databaseName)).some((item) => item.id === otherScopeQuotation.id),
        false
      );
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
      assert.match(databaseName, /^cxapp_quotation_e2e_\d+$/);
      await cleanup.query(`DROP DATABASE IF EXISTS \`${databaseName}\``);
      await cleanup.end();
    }
  }
}

const parentSchema = [
  "CREATE TABLE core_companies (id INT PRIMARY KEY, name VARCHAR(180) NOT NULL, status VARCHAR(24) NOT NULL)",
  "CREATE TABLE core_financial_years (id INT PRIMARY KEY, name VARCHAR(180) NOT NULL, start_date DATE NOT NULL, end_date DATE NOT NULL, status VARCHAR(24) NOT NULL)",
  "CREATE TABLE core_contacts (id INT PRIMARY KEY, name VARCHAR(180) NOT NULL, legal_name VARCHAR(180) NULL, primary_email VARCHAR(180) NULL, primary_phone VARCHAR(40) NULL, gstin VARCHAR(40) NULL, credit_limit DECIMAL(14,2) NOT NULL DEFAULT 0, status VARCHAR(24) NOT NULL)",
  "CREATE TABLE core_states (id INT PRIMARY KEY, code VARCHAR(80) NOT NULL, name VARCHAR(180) NOT NULL)",
  "CREATE TABLE core_contacts_addresses (id INT PRIMARY KEY, parent_id INT NOT NULL, address_line1 VARCHAR(255) NOT NULL, address_line2 VARCHAR(255) NULL, city_name VARCHAR(120) NULL, district_name VARCHAR(120) NULL, state_id INT NULL, state_name VARCHAR(120) NULL, pincode_name VARCHAR(24) NULL, country_name VARCHAR(120) NULL)",
  "CREATE TABLE core_work_orders (id INT PRIMARY KEY, code VARCHAR(120) NOT NULL, name VARCHAR(180) NULL, status VARCHAR(24) NOT NULL)",
  "CREATE TABLE core_ledgers (id INT PRIMARY KEY, name VARCHAR(180) NOT NULL, status VARCHAR(24) NOT NULL)",
  "CREATE TABLE core_currencies (id INT PRIMARY KEY, name VARCHAR(24) NOT NULL, status VARCHAR(24) NOT NULL)",
  "CREATE TABLE app_users (id INT PRIMARY KEY)",
  "CREATE TABLE core_products (id INT PRIMARY KEY, name VARCHAR(180) NOT NULL, hsn_code_id INT NULL, gst_tax_id INT NULL, unit_id INT NULL, status VARCHAR(24) NOT NULL, deleted_at DATETIME(3) NULL)",
  "CREATE TABLE core_hsn_codes (id INT PRIMARY KEY, code VARCHAR(40) NOT NULL, status VARCHAR(24) NOT NULL)",
  "CREATE TABLE core_colours (id INT PRIMARY KEY, name VARCHAR(120) NOT NULL, status VARCHAR(24) NOT NULL)",
  "CREATE TABLE core_sizes (id INT PRIMARY KEY, name VARCHAR(120) NOT NULL, status VARCHAR(24) NOT NULL)",
  "CREATE TABLE core_units (id INT PRIMARY KEY, name VARCHAR(120) NOT NULL, status VARCHAR(24) NOT NULL)",
  "CREATE TABLE core_taxes (id INT PRIMARY KEY, name VARCHAR(120) NOT NULL, status VARCHAR(24) NOT NULL)",
  "CREATE TABLE core_transports (id INT PRIMARY KEY, name VARCHAR(180) NOT NULL, gst VARCHAR(40) NULL, status VARCHAR(24) NOT NULL)",
  "CREATE TABLE core_default_company_settings (singleton_key INT PRIMARY KEY, company_id INT NOT NULL, financial_year_id INT NOT NULL, status VARCHAR(24) NOT NULL)"
];

const parentRecords = [
  "INSERT INTO core_companies VALUES (1, 'E2E Company', 'active')",
  "INSERT INTO core_financial_years VALUES (1, '2026-27', '2026-04-01', '2027-03-31', 'active')",
  "INSERT INTO core_contacts VALUES (1, 'E2E Customer', 'E2E Customer', 'customer@example.test', '9000000000', '33ABCDE1234F1Z5', 0, 'active')",
  "INSERT INTO core_states VALUES (1, '33', 'Tamil Nadu'), (2, '29', 'Karnataka')",
  "INSERT INTO core_contacts_addresses VALUES (1, 1, '1 Test Street', NULL, 'Chennai', 'Chennai', 1, 'Tamil Nadu', '600001', 'India')",
  "INSERT INTO core_work_orders VALUES (1, 'WO-1', 'E2E Work Order', 'active')",
  "INSERT INTO core_ledgers VALUES (1, 'Sales', 'active')",
  "INSERT INTO core_currencies VALUES (1, 'INR', 'active')",
  "INSERT INTO core_products VALUES (1, 'E2E Product', 1, 1, 1, 'active', NULL)",
  "INSERT INTO core_hsn_codes VALUES (1, '6109', 'active')",
  "INSERT INTO core_colours VALUES (1, 'Blue', 'active')",
  "INSERT INTO core_sizes VALUES (1, 'M', 'active')",
  "INSERT INTO core_units VALUES (1, 'Nos', 'active')",
  "INSERT INTO core_taxes VALUES (1, 'GST 18%', 'active')",
  "INSERT INTO core_transports VALUES (1, 'E2E Transport', '33AAAAA0000A1Z5', 'active')",
  "INSERT INTO core_default_company_settings VALUES (1, 1, 1, 'active')"
];

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runQuotationE2e()
    .then((result) => console.log("Quotation relational E2E passed", result))
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
