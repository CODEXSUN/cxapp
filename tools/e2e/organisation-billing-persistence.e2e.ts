import assert from "node:assert/strict";
import type { FastifyInstance } from "fastify";
import { createConnection, type RowDataPacket } from "mysql2/promise";
import { createApiApp } from "@codexsun/framework/api";
import {
  runWithBillingScope,
  withBillingScope
} from "../../apps/billing/api/src/auth/billing-scope.js";
import {
  bootstrapBillingDatabase,
  closeAllBillingDatabases
} from "../../apps/billing/api/src/database/billing-database.js";
import { QuotationService } from "../../apps/billing/api/src/modules/quotation/quotation.service.js";
import { registerQuotationRoutes } from "../../apps/billing/api/src/modules/quotation/quotation.routes.js";
import { PaymentService } from "../../apps/billing/api/src/modules/payment/payment.service.js";
import { registerPaymentRoutes } from "../../apps/billing/api/src/modules/payment/payment.routes.js";
import { registerReceiptRoutes } from "../../apps/billing/api/src/modules/receipt/receipt.routes.js";
import { registerExportSalesRoutes } from "../../apps/billing/api/src/modules/export-sales/export-sales.routes.js";
import { registerPurchaseRoutes } from "../../apps/billing/api/src/modules/purchase/purchase.routes.js";
import { PurchaseService } from "../../apps/billing/api/src/modules/purchase/purchase.service.js";
import { SalesService } from "../../apps/billing/api/src/modules/sales/sales.service.js";
import { registerSalesRoutes } from "../../apps/billing/api/src/modules/sales/sales.routes.js";
import { registerDashboardRoutes } from "../../apps/billing/api/src/modules/dashboard/dashboard.routes.js";
import { registerProductRoutes } from "../../apps/core/api/src/modules/master/product/product.routes.js";
import { registerContactRoutes } from "../../apps/core/api/src/modules/master/contact/contact.routes.js";
import { seedContactModule } from "../../apps/core/api/src/modules/master/contact/contact.seed.js";
import { removeUnknownCountrySeed } from "../../apps/core/api/src/modules/common/location/country/country.seed.js";
import { seedStateModule } from "../../apps/core/api/src/modules/common/location/state/state.seed.js";
import {
  bootstrapCoreDatabase,
  closeCoreDatabase,
  runWithCoreDatabase
} from "../../apps/core/api/src/database/core-database.js";
import { env } from "../../apps/core/api/src/env.js";

const runId = Date.now();
const databaseName = `codexsun_persistence_e2e_${runId}`;
const isolatedDatabaseName = `codexsun_persistence_isolated_e2e_${runId}`;
const admin = await createConnection({
  host: env.DB_HOST,
  password: env.DB_PASSWORD,
  port: env.DB_PORT,
  user: env.DB_USER
});
let api: FastifyInstance | null = null;
let billingScopeHeaders = { "x-company-id": "1", "x-financial-year-id": "1" };

try {
  await prepareTenant(databaseName);
  await prepareTenant(isolatedDatabaseName);

  await admin.changeUser({ database: databaseName });
  await assertIndiaCountryDefault(admin);
  const references = await loadReferences(admin);
  billingScopeHeaders = {
    "x-company-id": String(references.companyId),
    "x-financial-year-id": String(references.financialYearId)
  };
  const quotationService = new QuotationService();
  const paymentService = new PaymentService();
  const purchaseService = new PurchaseService();
  const salesService = new SalesService();
  api = await createApiApp({
    appName: "CODEXSUN Billing persistence E2E",
    cookieSecret: "billing-persistence-e2e-secret",
    corsOrigins: [],
    environment: "test"
  });
  api.addHook("onRequest", (request, _reply, done) => {
    if (!request.url.startsWith("/billing/")) return done();
    runWithBillingScope(request, done);
  });
  await registerQuotationRoutes(api);
  await registerPurchaseRoutes(api);
  await registerPaymentRoutes(api);
  await registerReceiptRoutes(api);
  await registerExportSalesRoutes(api);
  await registerSalesRoutes(api);
  await registerDashboardRoutes(api);
  await registerProductRoutes(api);
  await registerContactRoutes(api);
  await api.ready();
  const timings: Record<string, number> = {};
  const context = await withBillingScope(
    { companyId: references.companyId, financialYearId: references.financialYearId },
    () => quotationService.getContext(databaseName)
  );
  assert.equal(context.companyId, references.companyId);
  assert.equal(context.financialYearId, references.financialYearId);
  assert.equal(context.currencyId, references.currencyId);

  await assertTenantBoundary(api, databaseName, isolatedDatabaseName);
  await assertLegacyCountryCleanup(admin, isolatedDatabaseName);
  await admin.changeUser({ database: databaseName });

  await runWithCoreDatabase(databaseName, async () => {
    await assertMinimalProduct(api!, databaseName, timings);
    await assertMinimalContact(api!, databaseName, references.contactTypeId, timings);
  });
  await assertMinimalDrafts(api, databaseName, references, timings);

  const quotationPayload = {
    ...documentPayload(references),
    date: references.documentDate,
    quotationNumber: "QT-PERSIST-001"
  };
  const quotation = await requestData(
    api,
    "POST",
    "/billing/quotations",
    databaseName,
    quotationPayload,
    timings
  );
  assert.equal(quotation.customerId, references.customerId);
  assert.equal(quotation.items.length, 1);

  const contactAfterReferencedAddressUpdate = await runWithCoreDatabase(databaseName, async () => {
    const contactBeforeReferencedAddressUpdate = await requestData(
      api!,
      "GET",
      `/core/master/contacts/${references.customerId}`,
      databaseName,
      undefined,
      timings
    );
    const referencedAddress = (contactBeforeReferencedAddressUpdate.addresses as ApiRecord[])[0];
    assert.ok(referencedAddress, "The Billing test contact must have a persisted address.");
    return requestData(
      api!,
      "PUT",
      `/core/master/contacts/${references.customerId}`,
      databaseName,
      {
        addresses: [
          {
            addressLine1: referencedAddress.addressLine1,
            addressLine2: referencedAddress.addressLine2,
            addressTypeId: referencedAddress.addressTypeId,
            addressTypeName: referencedAddress.addressTypeName,
            cityId: referencedAddress.cityId,
            cityName: referencedAddress.cityName,
            countryId: referencedAddress.countryId,
            countryName: referencedAddress.countryName,
            districtId: referencedAddress.districtId,
            districtName: referencedAddress.districtName,
            isDefault: true,
            pincodeId: referencedAddress.pincodeId,
            pincodeName: referencedAddress.pincodeName,
            stateId: referencedAddress.stateId,
            stateName: referencedAddress.stateName
          }
        ],
        isActive: true,
        legalName: contactBeforeReferencedAddressUpdate.legalName,
        name: contactBeforeReferencedAddressUpdate.name,
        typeId: references.contactTypeId
      },
      timings
    );
  });
  assert.equal(
    Number((contactAfterReferencedAddressUpdate.addresses as ApiRecord[])[0]?.id),
    references.addressId,
    "Editing a contact must preserve an address ID already referenced by Billing."
  );

  const listedQuotations = await requestList(api, "/billing/quotations", databaseName, timings);
  assert.equal(
    listedQuotations.some((entry) => entry.id === quotation.id),
    true
  );
  await expectApiError(
    api,
    "GET",
    `/billing/quotations/${quotation.id}`,
    isolatedDatabaseName,
    undefined,
    404,
    "NOT_FOUND"
  );
  const fetchedQuotation = await requestData(
    api,
    "GET",
    `/billing/quotations/${quotation.id}`,
    databaseName,
    undefined,
    timings
  );
  assert.equal(fetchedQuotation.quotationNumber, "QT-PERSIST-001");
  const updatedQuotation = await requestData(
    api,
    "PUT",
    `/billing/quotations/${quotation.id}`,
    databaseName,
    {
      ...quotationPayload,
      notes: "Updated quotation through HTTP CRUD"
    },
    timings
  );
  assert.equal(updatedQuotation.notes, "Updated quotation through HTTP CRUD");
  assert.equal(
    (
      await requestData(
        api,
        "POST",
        `/billing/quotations/${quotation.id}/confirm`,
        databaseName,
        undefined,
        timings
      )
    ).status,
    "confirmed"
  );
  await expectApiError(
    api,
    "PUT",
    `/billing/quotations/${quotation.id}`,
    databaseName,
    quotationPayload,
    409,
    "CONFLICT"
  );
  assert.equal(
    (
      await requestData(
        api,
        "POST",
        `/billing/quotations/${quotation.id}/cancel`,
        databaseName,
        undefined,
        timings
      )
    ).status,
    "cancelled"
  );
  assert.equal(
    (
      await requestData(
        api,
        "POST",
        `/billing/quotations/${quotation.id}/revoke`,
        databaseName,
        undefined,
        timings
      )
    ).status,
    "draft"
  );

  const salePayload = {
    ...documentPayload(references),
    invoiceNumber: "INV-PERSIST-001",
    items: documentPayload(references).items.map((item) => ({ ...item, description: "" })),
    issuedOn: references.documentDate
  };
  const sale = await requestData(api, "POST", "/billing/sales", databaseName, salePayload, timings);
  assert.equal(sale.customerId, references.customerId);
  assert.equal(sale.items.length, 1);
  assert.equal(sale.items[0]?.description, "");

  const listedSales = await requestList(api, "/billing/sales", databaseName, timings);
  assert.equal(
    listedSales.some((entry) => entry.id === sale.id),
    true
  );
  await expectApiError(
    api,
    "GET",
    `/billing/sales/${sale.id}`,
    isolatedDatabaseName,
    undefined,
    404,
    "NOT_FOUND"
  );
  const fetchedSale = await requestData(
    api,
    "GET",
    `/billing/sales/${sale.id}`,
    databaseName,
    undefined,
    timings
  );
  assert.equal(fetchedSale.invoiceNumber, "INV-PERSIST-001");

  const concurrentSales = await Promise.all([
    requestData(
      api,
      "POST",
      "/billing/sales",
      databaseName,
      { ...salePayload, invoiceNumber: "INV-CONCURRENT-001" },
      timings
    ),
    requestData(
      api,
      "POST",
      "/billing/sales",
      databaseName,
      { ...salePayload, invoiceNumber: "INV-CONCURRENT-001" },
      timings
    )
  ]);
  assert.equal(new Set(concurrentSales.map((entry) => entry.id)).size, 2);
  assert.equal(new Set(concurrentSales.map((entry) => entry.lineNumber)).size, 2);
  assert.equal(new Set(concurrentSales.map((entry) => entry.invoiceNumber)).size, 2);
  assert.equal(
    concurrentSales.filter((entry) => entry.invoiceNumber === "INV-CONCURRENT-001").length,
    1
  );
  assert.equal(
    concurrentSales.some((entry) =>
      String(entry.numberingWarning ?? "").includes("already reserved")
    ),
    true
  );
  const salesPage = await requestData(
    api,
    "GET",
    "/billing/sales/page?page=1&pageSize=10&search=INV-CONCURRENT&status=all",
    databaseName,
    undefined,
    timings
  );
  assert.equal(salesPage.items.length, 1);
  assert.equal(salesPage.total, 1);

  const sale12Payload = {
    ...salePayload,
    invoiceNumber: "INV-PERSIST-012",
    items: documentItems(references, 12, "Sale 12 item")
  };
  const sale12 = await requestData(
    api,
    "POST",
    "/billing/sales",
    databaseName,
    sale12Payload,
    timings
  );
  const sale12CreateMs = timings["POST /billing/sales"] ?? Number.POSITIVE_INFINITY;
  assert.equal(sale12.items.length, 12);
  const fetchedSale12 = await requestData(
    api,
    "GET",
    `/billing/sales/${sale12.id}`,
    databaseName,
    undefined,
    timings
  );
  const sale12LoadMs = timings[`GET /billing/sales/${sale12.id}`] ?? Number.POSITIVE_INFINITY;
  assert.equal(fetchedSale12.items.length, 12);

  const sale24Payload = {
    ...salePayload,
    invoiceNumber: "INV-PERSIST-024",
    items: documentItems(references, 24, "Sale 24 item")
  };
  const sale24 = await requestData(
    api,
    "POST",
    "/billing/sales",
    databaseName,
    sale24Payload,
    timings
  );
  const sale24CreateMs = timings["POST /billing/sales"] ?? Number.POSITIVE_INFINITY;
  assert.equal(sale24.items.length, 24);
  const fetchedSale24 = await requestData(
    api,
    "GET",
    `/billing/sales/${sale24.id}`,
    databaseName,
    undefined,
    timings
  );
  const sale24LoadMs = timings[`GET /billing/sales/${sale24.id}`] ?? Number.POSITIVE_INFINITY;
  assert.equal(fetchedSale24.items.length, 24);

  const mergeQuotationItems = documentItems(references, 12, "Merged quotation item");
  const mergeQuotationA = await requestData(
    api,
    "POST",
    "/billing/quotations",
    databaseName,
    {
      ...quotationPayload,
      items: mergeQuotationItems,
      quotationNumber: "QT-MERGE-001"
    },
    timings
  );
  const mergeQuotationB = await requestData(
    api,
    "POST",
    "/billing/quotations",
    databaseName,
    {
      ...quotationPayload,
      items: mergeQuotationItems.map((item) => ({ ...item, quantity: item.quantity + 1 })),
      quotationNumber: "QT-MERGE-002"
    },
    timings
  );
  assert.equal(mergeQuotationA.items.length, 12);
  assert.equal(mergeQuotationB.items.length, 12);
  const mergedConversion = await requestData(
    api,
    "POST",
    "/billing/quotations/convert-to-sale",
    databaseName,
    { quotationIds: [mergeQuotationA.id, mergeQuotationB.id] },
    timings
  );
  const quotationMergeMs =
    timings["POST /billing/quotations/convert-to-sale"] ?? Number.POSITIVE_INFINITY;
  assert.equal(mergedConversion.quotations.length, 2);
  assert.equal(mergedConversion.sale.items.length, 12);
  for (const [index, item] of mergedConversion.sale.items.entries()) {
    assert.equal(
      item.quantity,
      index * 2 + 3,
      `Merged quotation line ${index + 1} quantity mismatch.`
    );
  }
  const updatedSale = await requestData(
    api,
    "PUT",
    `/billing/sales/${sale.id}`,
    databaseName,
    {
      ...salePayload,
      notes: "Updated sale through HTTP CRUD"
    },
    timings
  );
  assert.equal(updatedSale.notes, "Updated sale through HTTP CRUD");
  assert.equal(
    (
      await requestData(
        api,
        "POST",
        `/billing/sales/${sale.id}/confirm`,
        databaseName,
        undefined,
        timings
      )
    ).status,
    "confirmed"
  );
  await expectApiError(
    api,
    "PUT",
    `/billing/sales/${sale.id}`,
    databaseName,
    salePayload,
    409,
    "CONFLICT"
  );
  await expectApiError(
    api,
    "POST",
    `/billing/sales/${sale.id}/confirm`,
    databaseName,
    undefined,
    409,
    "CONFLICT"
  );
  assert.equal(
    (
      await requestData(
        api,
        "POST",
        `/billing/sales/${sale.id}/cancel`,
        databaseName,
        undefined,
        timings
      )
    ).status,
    "cancelled"
  );
  await expectApiError(
    api,
    "DELETE",
    `/billing/sales/${sale.id}`,
    databaseName,
    undefined,
    409,
    "CONFLICT"
  );
  await expectApiError(
    api,
    "POST",
    `/billing/sales/${sale.id}/cancel`,
    databaseName,
    undefined,
    409,
    "CONFLICT"
  );
  await expectApiError(
    api,
    "PUT",
    `/billing/sales/${sale.id}`,
    databaseName,
    salePayload,
    409,
    "CONFLICT"
  );
  assert.equal(
    (
      await requestData(
        api,
        "POST",
        `/billing/sales/${sale.id}/revoke`,
        databaseName,
        undefined,
        timings
      )
    ).status,
    "draft"
  );
  await expectApiError(
    api,
    "POST",
    `/billing/sales/${sale.id}/revoke`,
    databaseName,
    undefined,
    409,
    "CONFLICT"
  );

  const purchasePayload = purchaseDocumentPayload(references);
  const purchase = await requestData(
    api,
    "POST",
    "/billing/purchases",
    databaseName,
    purchasePayload,
    timings
  );
  assert.equal(purchase.supplierId, references.customerId);
  assert.equal(purchase.items[0]?.description, "");
  assert.equal(
    (
      await requestData(
        api,
        "POST",
        `/billing/purchases/${purchase.id}/confirm`,
        databaseName,
        undefined,
        timings
      )
    ).status,
    "confirmed"
  );

  const paymentContext = await requestData(
    api,
    "GET",
    "/billing/payments/context",
    databaseName,
    undefined,
    timings
  );
  assert.equal(paymentContext.companyId, references.companyId);
  assert.match(paymentContext.suggestedPaymentNumber, /.+/);
  const candidates = await requestList(
    api,
    `/billing/payments/allocations?supplierId=${references.customerId}`,
    databaseName,
    timings
  );
  const candidate = candidates.find((entry) => entry.purchaseId === purchase.id);
  assert.ok(candidate, "Confirmed purchase was not offered for payment allocation.");
  assert.equal(candidate.outstandingAmount, purchase.amount);

  const paymentPayload = paymentDocumentPayload(references, purchase);
  const payment = await requestData(
    api,
    "POST",
    "/billing/payments",
    databaseName,
    paymentPayload,
    timings
  );
  assert.equal(payment.supplierId, references.customerId);
  assert.equal(payment.allocatedAmount, purchase.amount);
  assert.equal(payment.unallocatedAmount, 0);
  await expectApiError(
    api,
    "GET",
    `/billing/payments/${payment.id}`,
    isolatedDatabaseName,
    undefined,
    404,
    "NOT_FOUND"
  );
  const updatedPayment = await requestData(
    api,
    "PUT",
    `/billing/payments/${payment.id}`,
    databaseName,
    { ...paymentPayload, notes: "Updated payment through HTTP CRUD" },
    timings
  );
  assert.equal(updatedPayment.notes, "Updated payment through HTTP CRUD");
  assert.equal(
    (
      await requestData(
        api,
        "POST",
        `/billing/payments/${payment.id}/post`,
        databaseName,
        undefined,
        timings
      )
    ).status,
    "posted"
  );
  await expectApiError(
    api,
    "PUT",
    `/billing/payments/${payment.id}`,
    databaseName,
    paymentPayload,
    409,
    "CONFLICT"
  );
  assert.equal(
    (
      await requestData(
        api,
        "POST",
        `/billing/payments/${payment.id}/cancel`,
        databaseName,
        undefined,
        timings
      )
    ).status,
    "cancelled"
  );
  await expectApiError(
    api,
    "POST",
    `/billing/payments/${payment.id}/cancel`,
    databaseName,
    undefined,
    409,
    "CONFLICT"
  );
  const paymentActivity = await requestList(
    api,
    `/billing/payments/${payment.id}/activity`,
    databaseName,
    timings
  );
  assert.deepEqual(
    paymentActivity.map((entry) => entry.action),
    ["cancelled", "posted", "updated", "created"]
  );
  await expectApiError(
    api,
    "GET",
    `/billing/payments/${payment.id}/activity`,
    isolatedDatabaseName,
    undefined,
    404,
    "NOT_FOUND"
  );
  const releasedCandidates = await requestList(
    api,
    `/billing/payments/allocations?supplierId=${references.customerId}`,
    databaseName,
    timings
  );
  assert.equal(
    releasedCandidates.find((entry) => entry.purchaseId === purchase.id)?.outstandingAmount,
    purchase.amount
  );

  const disposablePayment = await requestData(
    api,
    "POST",
    "/billing/payments",
    databaseName,
    { ...paymentPayload, allocations: [], amount: 50, paymentNumber: "PAY-PERSIST-DELETE" },
    timings
  );
  await requestData(
    api,
    "DELETE",
    `/billing/payments/${disposablePayment.id}`,
    databaseName,
    undefined,
    timings
  );
  await expectApiError(
    api,
    "GET",
    `/billing/payments/${disposablePayment.id}`,
    databaseName,
    undefined,
    404,
    "NOT_FOUND"
  );

  await closeAllBillingDatabases();
  await bootstrapBillingDatabase(databaseName);

  const [
    persistedQuotation,
    persistedPayment,
    persistedPaymentActivity,
    persistedPurchase,
    persistedSale,
    persistedSale12,
    persistedSale24,
    persistedMergedSale
  ] = await withBillingScope(
    { companyId: references.companyId, financialYearId: references.financialYearId },
    () =>
      Promise.all([
        quotationService.get(databaseName, quotation.id),
        paymentService.get(databaseName, payment.id),
        paymentService.activity(databaseName, payment.id),
        purchaseService.get(databaseName, purchase.id),
        salesService.getSale(databaseName, sale.id),
        salesService.getSale(databaseName, sale12.id),
        salesService.getSale(databaseName, sale24.id),
        salesService.getSale(databaseName, mergedConversion.sale.id)
      ])
  );
  assert.equal(persistedQuotation?.quotationNumber, "QT-PERSIST-001");
  assert.equal(persistedQuotation?.items[0]?.description, "Dummy persisted product");
  assert.equal(persistedSale?.invoiceNumber, "INV-PERSIST-001");
  assert.equal(persistedSale?.items[0]?.description, "");
  assert.equal(persistedSale12?.items.length, 12);
  assert.equal(persistedSale24?.items.length, 24);
  assert.equal(persistedMergedSale?.items.length, 12);
  assert.equal(persistedPurchase?.items[0]?.description, "");
  assert.equal(persistedPayment?.paymentNumber, payment.paymentNumber);
  assert.equal(persistedPayment?.status, "cancelled");
  assert.equal(persistedPayment?.allocations[0]?.purchaseId, purchase.id);
  assert.equal(persistedPaymentActivity?.length, 4);

  const conversion = await requestData(
    api,
    "POST",
    `/billing/quotations/${quotation.id}/convert-to-sale`,
    databaseName,
    undefined,
    timings
  );
  assert.equal(conversion.sale.customerId, references.customerId);
  assert.equal(conversion.quotation.generatedSalesInvoiceNo, conversion.sale.invoiceNumber);

  await expectApiError(
    api,
    "DELETE",
    `/billing/quotations/${quotation.id}`,
    databaseName,
    undefined,
    409,
    "CONFLICT"
  );
  await requestData(api, "DELETE", `/billing/sales/${sale.id}`, databaseName, undefined, timings);
  await expectApiError(
    api,
    "GET",
    `/billing/sales/${sale.id}`,
    databaseName,
    undefined,
    404,
    "NOT_FOUND"
  );

  const disposableQuotation = await requestData(
    api,
    "POST",
    "/billing/quotations",
    databaseName,
    {
      ...quotationPayload,
      quotationNumber: "QT-PERSIST-DELETE"
    },
    timings
  );
  await requestData(
    api,
    "DELETE",
    `/billing/quotations/${disposableQuotation.id}`,
    databaseName,
    undefined,
    timings
  );
  await expectApiError(
    api,
    "GET",
    `/billing/quotations/${disposableQuotation.id}`,
    databaseName,
    undefined,
    404,
    "NOT_FOUND"
  );

  const maxRequestMs = Math.max(...Object.values(timings));
  assert.ok(maxRequestMs < 2_000, `Warm API request exceeded 2s: ${maxRequestMs.toFixed(1)}ms`);

  for (const path of [
    "/billing/quotations/page?page=1&pageSize=10&search=&status=all&customer=all",
    "/billing/purchases/page?page=1&pageSize=10&search=&status=all&customer=all",
    "/billing/export-sales/page?page=1&pageSize=10&search=&status=all&customer=all",
    "/billing/payments/page?page=1&pageSize=10&search=&status=all",
    "/billing/receipts/page?page=1&pageSize=10&search=&status=all"
  ]) {
    const pageResult = await requestData(api, "GET", path, databaseName, undefined, timings);
    assert.ok(Array.isArray(pageResult.items), `${path} did not return page items.`);
    assert.ok(pageResult.items.length <= 10, `${path} exceeded the requested page size.`);
    assert.ok(pageResult.total >= pageResult.items.length, `${path} returned an invalid total.`);
  }

  const [counts] = await admin.query<Array<RowDataPacket & CountRow>>(
    `SELECT
      (SELECT COUNT(*) FROM billing_quotations WHERE deleted_at IS NULL) AS quotations,
      (SELECT COUNT(*) FROM billing_quotation_items item INNER JOIN billing_quotations parent ON parent.id=item.quotation_id WHERE parent.deleted_at IS NULL) AS quotation_items,
      (SELECT COUNT(*) FROM billing_sales WHERE deleted_at IS NULL) AS sales,
      (SELECT COUNT(*) FROM billing_sales_items item INNER JOIN billing_sales parent ON parent.id=item.sales_id WHERE parent.deleted_at IS NULL) AS sales_items,
      (SELECT COUNT(*) FROM billing_purchases WHERE deleted_at IS NULL) AS purchases,
      (SELECT COUNT(*) FROM billing_payments WHERE deleted_at IS NULL) AS payments,
      (SELECT COUNT(*) FROM billing_payment_activities activity INNER JOIN billing_payments parent ON parent.id=activity.payment_id WHERE parent.deleted_at IS NULL) AS payment_activities,
      (SELECT COUNT(*) FROM billing_payment_allocations allocation INNER JOIN billing_payments parent ON parent.id=allocation.payment_id WHERE parent.deleted_at IS NULL) AS payment_allocations`
  );
  assert.equal(Number(counts[0]?.quotations), 3);
  assert.equal(Number(counts[0]?.quotation_items), 25);
  assert.equal(Number(counts[0]?.sales), 6);
  assert.equal(Number(counts[0]?.sales_items), 51);
  assert.equal(Number(counts[0]?.purchases), 1);
  assert.equal(Number(counts[0]?.payments), 1);
  assert.equal(Number(counts[0]?.payment_activities), 4);
  assert.equal(Number(counts[0]?.payment_allocations), 1);

  const confirmedDashboardSale = await requestData(
    api,
    "POST",
    `/billing/sales/${sale12.id}/confirm`,
    databaseName,
    undefined,
    timings
  );
  assert.equal(confirmedDashboardSale.status, "confirmed");

  const dashboard = await requestData(
    api,
    "GET",
    "/billing/dashboard",
    databaseName,
    undefined,
    timings
  );
  const dashboardMetrics = dashboard.metrics as ApiRecord;
  const dashboardSales = dashboardMetrics.sales as ApiRecord;
  assert.ok(Number(dashboardSales.financialYear) > 0, "Dashboard sales projection is empty.");
  assert.ok(Array.isArray(dashboard.monthly) && dashboard.monthly.length > 0);
  assert.ok(Array.isArray(dashboard.recent) && dashboard.recent.length > 0);
  assert.ok(Array.isArray(dashboard.outstanding));
  const [dashboardRows] = await admin.query<Array<RowDataPacket & { row_count: number | string }>>(
    "SELECT COUNT(*) AS row_count FROM billing_dashboard_snapshots"
  );
  assert.equal(Number(dashboardRows[0]?.row_count), 1);

  console.log("Organisation/Billing persistence E2E passed", {
    convertedSaleId: conversion.sale.id,
    databaseName,
    isolatedDatabaseName,
    maxRequestMs: Number(maxRequestMs.toFixed(1)),
    quotationMergeMs: Number(quotationMergeMs.toFixed(1)),
    paymentId: payment.id,
    purchaseId: purchase.id,
    quotationId: quotation.id,
    sale12CreateMs: Number(sale12CreateMs.toFixed(1)),
    sale12LoadMs: Number(sale12LoadMs.toFixed(1)),
    sale24CreateMs: Number(sale24CreateMs.toFixed(1)),
    sale24LoadMs: Number(sale24LoadMs.toFixed(1)),
    saleId: conversion.sale.id
  });
} finally {
  await api?.close();
  await closeAllBillingDatabases();
  await closeCoreDatabase();
  await admin.changeUser({ database: env.DB_MASTER_NAME });
  await admin.query(`DROP DATABASE IF EXISTS \`${databaseName}\``);
  await admin.query(`DROP DATABASE IF EXISTS \`${isolatedDatabaseName}\``);
  await admin.end();
}

async function assertIndiaCountryDefault(connection: Awaited<ReturnType<typeof createConnection>>) {
  const [countries] = await connection.query<RowDataPacket[]>(
    "SELECT code,name,sort_order FROM countries ORDER BY sort_order,name"
  );
  assert.equal(countries[0]?.code, "IN", "India must be the first seeded Country.");
  assert.equal(countries[0]?.name, "India", "India must be the default seeded Country.");
  assert.equal(
    countries.some((country) => country.code === "UNKNOWN" || country.name === "-"),
    false,
    "The removed hyphen Country must not be seeded."
  );
  const [fallbackStates] = await connection.query<RowDataPacket[]>(
    `SELECT countries.code country_code FROM states
      INNER JOIN countries ON countries.id=states.country_id
      WHERE states.code='UNKNOWN' OR states.name='-'`
  );
  assert.equal(
    fallbackStates[0]?.country_code,
    "IN",
    "The fallback State chain must remain valid under India."
  );
  const [states] = await connection.query<RowDataPacket[]>(
    "SELECT code,name,sort_order FROM states ORDER BY sort_order,name"
  );
  assert.equal(states[0]?.name, "-", "The fallback State must remain first.");
  assert.equal(states[1]?.name, "Tamil Nadu", "Tamil Nadu must be the second seeded State.");
  assert.equal(states[1]?.sort_order, 1, "Tamil Nadu must have State sort order one.");
}

async function assertLegacyCountryCleanup(
  connection: Awaited<ReturnType<typeof createConnection>>,
  tenantDatabase: string
) {
  await connection.changeUser({ database: tenantDatabase });
  await connection.query(
    "INSERT INTO countries (code,name,sort_order,status) VALUES ('UNKNOWN','-',-1,'active')"
  );
  const [legacyCountries] = await connection.query<RowDataPacket[]>(
    "SELECT id FROM countries WHERE code='UNKNOWN'"
  );
  const legacyCountryId = Number(legacyCountries[0]?.id);
  assert.ok(legacyCountryId > 0);
  await connection.query("UPDATE states SET country_id=? WHERE code='UNKNOWN'", [legacyCountryId]);
  await connection.query(
    "INSERT INTO states (country_id,code,name,sort_order,status) VALUES (?,'LEGACY-STATE','Legacy State',999,'active')",
    [legacyCountryId]
  );
  await connection.query(
    "UPDATE contacts_addresses SET country_id=?,country_name='-' ORDER BY id LIMIT 1",
    [legacyCountryId]
  );

  await runWithCoreDatabase(tenantDatabase, async () => {
    await seedStateModule();
    await seedContactModule();
    await removeUnknownCountrySeed();
  });

  const [remainingLegacyCountries] = await connection.query<RowDataPacket[]>(
    "SELECT id FROM countries WHERE code='UNKNOWN' OR name='-'"
  );
  assert.equal(
    remainingLegacyCountries.length,
    0,
    "Legacy hyphen Country cleanup must be repeatable."
  );
  const [invalidStates] = await connection.query<RowDataPacket[]>(
    `SELECT states.id FROM states
      INNER JOIN countries ON countries.id=states.country_id
      WHERE states.code IN ('UNKNOWN','LEGACY-STATE') AND countries.code<>'IN'`
  );
  assert.equal(invalidStates.length, 0, "Legacy States must be reparented to India.");
  const [invalidAddresses] = await connection.query<RowDataPacket[]>(
    `SELECT contacts_addresses.id FROM contacts_addresses
      LEFT JOIN countries ON countries.id=contacts_addresses.country_id
      WHERE contacts_addresses.country_id IS NOT NULL AND countries.id IS NULL`
  );
  assert.equal(
    invalidAddresses.length,
    0,
    "Contact addresses must retain a valid Country reference."
  );
}

function purchaseDocumentPayload(references: References) {
  const base = documentPayload(references);
  return {
    ...base,
    invoiceNumber: "PUR-PERSIST-001",
    items: base.items.map((item) => ({ ...item, description: "" })),
    issuedOn: references.documentDate,
    supplierBillDate: "",
    supplierBillNo: "",
    supplierEmail: "dummy@example.test",
    supplierId: references.customerId,
    supplierName: "Dummy persisted supplier",
    supplierPhone: "9000000000"
  };
}

function paymentDocumentPayload(references: References, purchase: ApiRecord) {
  return {
    allocations: [{ allocatedAmount: Number(purchase.amount), purchaseId: purchase.id }],
    amount: Number(purchase.amount),
    companyId: references.companyId,
    currencyId: references.currencyId,
    discountAmount: 0,
    financialYearId: references.financialYearId,
    ledgerId: references.ledgerId,
    notes: "Cross-app payment persistence E2E",
    paymentDate: references.documentDate,
    paymentMode: "bank",
    paymentNumber: "PAY-PERSIST-001",
    referenceDate: "",
    referenceNo: "",
    roundOff: 0,
    supplierId: references.customerId,
    tdsAmount: 0
  };
}

async function assertMinimalDrafts(
  app: FastifyInstance,
  tenantDatabase: string,
  references: References,
  timings: Record<string, number>
) {
  const base = {
    ...documentPayload(references),
    items: [],
    ledgerId: null,
    salesLedger: "",
    workOrderId: null,
    workOrderNo: ""
  };
  const drafts = [
    await requestData(
      app,
      "POST",
      "/billing/quotations",
      tenantDatabase,
      {
        ...base,
        date: references.documentDate,
        quotationNumber: "QT-MINIMAL-001"
      },
      timings
    ),
    await requestData(
      app,
      "POST",
      "/billing/sales",
      tenantDatabase,
      {
        ...base,
        invoiceNumber: "INV-MINIMAL-001",
        issuedOn: references.documentDate
      },
      timings
    ),
    await requestData(
      app,
      "POST",
      "/billing/purchases",
      tenantDatabase,
      {
        ...base,
        invoiceNumber: "PUR-MINIMAL-001",
        issuedOn: references.documentDate,
        supplierBillDate: "",
        supplierBillNo: "",
        supplierEmail: "",
        supplierId: references.customerId,
        supplierName: "Dummy persisted supplier",
        supplierPhone: ""
      },
      timings
    ),
    await requestData(
      app,
      "POST",
      "/billing/export-sales",
      tenantDatabase,
      {
        ...base,
        invoiceNumber: "EXP-MINIMAL-001",
        issuedOn: references.documentDate
      },
      timings
    )
  ];
  for (const draft of drafts) {
    assert.equal(draft.status, "draft");
    assert.deepEqual(draft.items, []);
    assert.ok(Number(draft.ledgerId) > 0);
    assert.ok(Number(draft.workOrderId) > 0);
  }
  await expectApiError(
    app,
    "POST",
    `/billing/sales/${drafts[1]!.id}/confirm`,
    tenantDatabase,
    undefined,
    409,
    "CONFLICT"
  );

  const zeroPayment = await requestData(
    app,
    "POST",
    "/billing/payments",
    tenantDatabase,
    {
      allocations: [],
      amount: 0,
      companyId: references.companyId,
      currencyId: references.currencyId,
      discountAmount: 0,
      financialYearId: references.financialYearId,
      ledgerId: 0,
      notes: "",
      paymentDate: references.documentDate,
      paymentMode: "cash",
      paymentNumber: "PAY-MINIMAL-001",
      referenceDate: "",
      referenceNo: "",
      roundOff: 0,
      supplierId: references.customerId,
      tdsAmount: 0
    },
    timings
  );
  const zeroReceipt = await requestData(
    app,
    "POST",
    "/billing/receipts",
    tenantDatabase,
    {
      allocations: [],
      amount: 0,
      companyId: references.companyId,
      currencyId: references.currencyId,
      customerId: references.customerId,
      discountAmount: 0,
      financialYearId: references.financialYearId,
      ledgerId: 0,
      notes: "",
      receiptDate: references.documentDate,
      receiptMode: "cash",
      receiptNumber: "REC-MINIMAL-001",
      referenceDate: "",
      referenceNo: "",
      roundOff: 0,
      tdsAmount: 0
    },
    timings
  );
  assert.equal(zeroPayment.totalAmount, 0);
  assert.ok(Number(zeroPayment.ledgerId) > 0);
  assert.equal(zeroReceipt.totalAmount, 0);
  assert.ok(Number(zeroReceipt.ledgerId) > 0);
  await expectApiError(
    app,
    "POST",
    `/billing/payments/${zeroPayment.id}/post`,
    tenantDatabase,
    undefined,
    409,
    "CONFLICT"
  );
  await expectApiError(
    app,
    "POST",
    `/billing/receipts/${zeroReceipt.id}/post`,
    tenantDatabase,
    undefined,
    409,
    "CONFLICT"
  );

  const paths = ["quotations", "sales", "purchases", "export-sales"];
  for (let index = 0; index < paths.length; index += 1)
    await requestData(
      app,
      "DELETE",
      `/billing/${paths[index]}/${drafts[index]!.id}`,
      tenantDatabase,
      undefined,
      timings
    );
  await requestData(
    app,
    "DELETE",
    `/billing/payments/${zeroPayment.id}`,
    tenantDatabase,
    undefined,
    timings
  );
  await requestData(
    app,
    "DELETE",
    `/billing/receipts/${zeroReceipt.id}`,
    tenantDatabase,
    undefined,
    timings
  );
}

async function assertMinimalProduct(
  app: FastifyInstance,
  tenantDatabase: string,
  timings: Record<string, number>
) {
  const created = await requestData(
    app,
    "POST",
    "/core/master/products",
    tenantDatabase,
    { name: "E2E Minimal Product" },
    timings
  );
  assert.equal(created.hsnCode, "-");
  assert.equal(created.unitName, "-");
  assert.equal(created.productCategoryName, "-");
  assert.ok(Number(created.hsnCodeId) > 0);
  const updated = await requestData(
    app,
    "PUT",
    `/core/master/products/${created.id}`,
    tenantDatabase,
    { name: "E2E Minimal Product Updated", hsnCodeId: Number(created.hsnCodeId) },
    timings
  );
  assert.equal(updated.hsnCode, "-");
  await requestData(
    app,
    "DELETE",
    `/core/master/products/${created.id}/force`,
    tenantDatabase,
    undefined,
    timings
  );
}

async function assertMinimalContact(
  app: FastifyInstance,
  tenantDatabase: string,
  contactTypeId: number,
  timings: Record<string, number>
) {
  const contact = await requestData(
    app,
    "POST",
    "/core/master/contacts",
    tenantDatabase,
    {
      name: "E2E Minimal Contact",
      typeId: contactTypeId
    },
    timings
  );
  const addresses = contact.addresses as ApiRecord[];
  assert.equal(addresses.length, 1);
  assert.equal(addresses[0]?.addressLine1, "-");
  assert.ok(Number(addresses[0]?.countryId) > 0);
  assert.ok(Number(addresses[0]?.addressTypeId) > 0);
  await requestData(
    app,
    "DELETE",
    `/core/master/contacts/${contact.id}/force`,
    tenantDatabase,
    undefined,
    timings
  );
}

async function prepareTenant(tenantDatabase: string) {
  await admin.query(
    `CREATE DATABASE \`${tenantDatabase}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await admin.changeUser({ database: tenantDatabase });
  await admin.query(
    "CREATE TABLE users (id INT NOT NULL AUTO_INCREMENT PRIMARY KEY) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
  );
  await bootstrapCoreDatabase(tenantDatabase);
  await createDummyCoreEntries(admin);
  await bootstrapBillingDatabase(tenantDatabase);
}

async function assertTenantBoundary(
  app: FastifyInstance,
  primaryDatabase: string,
  secondaryDatabase: string
) {
  const primary = await requestList(app, "/billing/quotations", primaryDatabase);
  const secondary = await requestList(app, "/billing/quotations", secondaryDatabase);
  assert.deepEqual(primary, []);
  assert.deepEqual(secondary, []);
  await expectApiError(
    app,
    "GET",
    "/billing/quotations",
    undefined,
    undefined,
    400,
    "VALIDATION_ERROR"
  );
  await expectApiError(
    app,
    "GET",
    "/billing/quotations",
    env.DB_MASTER_NAME,
    undefined,
    400,
    "VALIDATION_ERROR"
  );
}

async function requestData(
  app: FastifyInstance,
  method: "DELETE" | "GET" | "POST" | "PUT",
  url: string,
  tenantDatabase: string,
  payload?: Record<string, unknown>,
  timings?: Record<string, number>
): Promise<ApiRecord> {
  const startedAt = performance.now();
  const response = await app.inject({
    headers: { ...billingScopeHeaders, "x-tenant-db": tenantDatabase },
    method,
    payload,
    url
  });
  if (timings) timings[`${method} ${url}`] = performance.now() - startedAt;
  assert.equal(response.statusCode, 200, response.body);
  const body = response.json() as SuccessEnvelope<ApiRecord>;
  assert.equal(body.success, true, response.body);
  assertEnvelopeMeta(body, response.body);
  assert.ok(body.data, response.body);
  return body.data;
}

async function requestList(
  app: FastifyInstance,
  url: string,
  tenantDatabase: string,
  timings?: Record<string, number>
): Promise<ApiRecord[]> {
  const startedAt = performance.now();
  const response = await app.inject({
    headers: { ...billingScopeHeaders, "x-tenant-db": tenantDatabase },
    method: "GET",
    url
  });
  if (timings) timings[`GET ${url}`] = performance.now() - startedAt;
  assert.equal(response.statusCode, 200, response.body);
  const body = response.json() as SuccessEnvelope<ApiRecord[]>;
  assert.equal(body.success, true, response.body);
  assertEnvelopeMeta(body, response.body);
  return body.data;
}

async function expectApiError(
  app: FastifyInstance,
  method: "DELETE" | "GET" | "POST" | "PUT",
  url: string,
  tenantDatabase: string | undefined,
  payload: Record<string, unknown> | undefined,
  statusCode: number,
  code: string
) {
  const response = await app.inject({
    headers: tenantDatabase
      ? { ...billingScopeHeaders, "x-tenant-db": tenantDatabase }
      : billingScopeHeaders,
    method,
    payload,
    url
  });
  assert.equal(response.statusCode, statusCode, response.body);
  const body = response.json() as ErrorEnvelope;
  assert.equal(body.success, false, response.body);
  assert.equal(body.error.code, code, response.body);
  assertEnvelopeMeta(body, response.body);
}

function assertEnvelopeMeta(body: Envelope, rawBody: string) {
  assert.match(body.meta.requestId, /.+/, rawBody);
  assert.doesNotThrow(() => new Date(body.meta.timestamp).toISOString(), rawBody);
}

async function createDummyCoreEntries(connection: typeof admin) {
  await connection.query(`
    INSERT INTO contacts (uuid,code,name,type_id,type_name,status)
    SELECT 'c0de0001','C-E2E','Dummy persisted customer',id,name,'active'
    FROM contact_types WHERE status='active' ORDER BY name<>'-',id LIMIT 1
  `);
  await connection.query(`
    INSERT INTO contacts_addresses (parent_id,address_line1,is_default,sort_order)
    SELECT id,'1 Persistence Street',1,1 FROM contacts WHERE code='C-E2E'
  `);
  await connection.query(
    "INSERT INTO work_orders (uuid,code,name,status) VALUES ('c0de0002','WO-E2E','Dummy persisted work order','active')"
  );
  await connection.query(`
    INSERT INTO products (uuid,name,hsn_code_id,unit_id,gst_tax_id,status)
    SELECT 'c0de0003','Dummy persisted product',
      (SELECT id FROM hsn_codes WHERE status='active' AND code<>'-' ORDER BY id LIMIT 1),
      (SELECT id FROM units WHERE status='active' AND LOWER(name)='nos' LIMIT 1),
      (SELECT id FROM taxes WHERE status='active' AND rate_percent=18 LIMIT 1),
      'active'
  `);
}

async function loadReferences(connection: typeof admin): Promise<References> {
  const [rows] = await connection.query<Array<RowDataPacket & ReferenceRow>>(`
    SELECT
      defaults.company_id,
      defaults.financial_year_id,
      DATE_FORMAT(financial_year.start_date,'%Y-%m-%d') AS document_date,
      currency.id AS currency_id,
      contact.id AS customer_id,
      contact.type_id AS contact_type_id,
      address.id AS address_id,
      work_order.id AS work_order_id,
      ledger.id AS ledger_id,
      product.id AS product_id,
      hsn.id AS hsn_code_id,
      colour.id AS colour_id,
      size.id AS size_id,
      unit.id AS unit_id,
      tax.id AS tax_id
    FROM default_company_settings defaults
    INNER JOIN financial_years financial_year ON financial_year.id=defaults.financial_year_id
    INNER JOIN currencies currency ON UPPER(currency.name)='INR' AND currency.status='active'
    INNER JOIN contacts contact ON contact.code='C-E2E'
    INNER JOIN contacts_addresses address ON address.parent_id=contact.id AND address.is_default=1
    INNER JOIN work_orders work_order ON work_order.code='WO-E2E'
    INNER JOIN ledgers ledger ON ledger.status='active' AND ledger.name<>'-'
    INNER JOIN products product ON product.name='Dummy persisted product'
    INNER JOIN hsn_codes hsn ON hsn.id=product.hsn_code_id
    INNER JOIN colours colour ON colour.status='active' AND colour.name<>'-'
    INNER JOIN sizes size ON size.status='active' AND size.name<>'-'
    INNER JOIN units unit ON unit.id=product.unit_id
    INNER JOIN taxes tax ON tax.id=product.gst_tax_id
    WHERE defaults.singleton_key=1
    LIMIT 1
  `);
  const row = rows[0];
  assert.ok(row, "Real Core bootstrap did not provide all Billing persistence references.");
  return {
    addressId: Number(row.address_id),
    colourId: Number(row.colour_id),
    companyId: Number(row.company_id),
    currencyId: Number(row.currency_id),
    customerId: Number(row.customer_id),
    contactTypeId: Number(row.contact_type_id),
    documentDate: String(row.document_date),
    financialYearId: Number(row.financial_year_id),
    hsnCodeId: Number(row.hsn_code_id),
    ledgerId: Number(row.ledger_id),
    productId: Number(row.product_id),
    sizeId: Number(row.size_id),
    taxId: Number(row.tax_id),
    unitId: Number(row.unit_id),
    workOrderId: Number(row.work_order_id)
  };
}

function documentPayload(references: References) {
  return {
    billingAddress: "1 Persistence Street",
    billingAddressId: references.addressId,
    companyId: references.companyId,
    currencyCode: "INR",
    currencyId: references.currencyId,
    customerEmail: "dummy@example.test",
    customerId: references.customerId,
    customerName: "Dummy persisted customer",
    customerPhone: "9000000000",
    financialYearId: references.financialYearId,
    items: [
      {
        colour: "Blue",
        colourId: references.colourId,
        description: "Dummy persisted product",
        hsnCode: "E2E",
        hsnCodeId: references.hsnCodeId,
        productId: references.productId,
        productName: "Dummy persisted product",
        quantity: 2,
        rate: 100,
        size: "M",
        sizeId: references.sizeId,
        taxId: references.taxId,
        taxRate: 18,
        unit: "Nos",
        unitId: references.unitId
      }
    ],
    ledgerId: references.ledgerId,
    notes: "Cross-app persistence E2E",
    roundOff: 0,
    salesLedger: "General Ledger",
    shippingAddress: "1 Persistence Street",
    shippingAddressId: references.addressId,
    status: "draft" as const,
    taxType: "cgst-sgst" as const,
    terms: "E2E terms",
    workOrderId: references.workOrderId,
    workOrderNo: "WO-E2E"
  };
}

function documentItems(references: References, count: number, descriptionPrefix: string) {
  const template = documentPayload(references).items[0]!;
  return Array.from({ length: count }, (_, index) => ({
    ...template,
    description: `${descriptionPrefix} ${index + 1}`,
    quantity: index + 1
  }));
}

type References = {
  addressId: number;
  colourId: number;
  companyId: number;
  currencyId: number;
  customerId: number;
  contactTypeId: number;
  documentDate: string;
  financialYearId: number;
  hsnCodeId: number;
  ledgerId: number;
  productId: number;
  sizeId: number;
  taxId: number;
  unitId: number;
  workOrderId: number;
};

type ReferenceRow = {
  address_id: number;
  colour_id: number;
  company_id: number;
  currency_id: number;
  customer_id: number;
  contact_type_id: number;
  document_date: string;
  financial_year_id: number;
  hsn_code_id: number;
  ledger_id: number;
  product_id: number;
  size_id: number;
  tax_id: number;
  unit_id: number;
  work_order_id: number;
};

type CountRow = {
  payment_activities: number;
  payment_allocations: number;
  payments: number;
  purchases: number;
  quotation_items: number;
  quotations: number;
  sales: number;
  sales_items: number;
};

type ApiRecord = Record<string, unknown> & {
  allocatedAmount: number;
  amount: number;
  companyId: number;
  customerId: number;
  generatedSalesInvoiceNo: string;
  id: string;
  invoiceNumber: string;
  items: Array<{ description: string; quantity: number }>;
  notes: string;
  outstandingAmount: number;
  paymentNumber: string;
  purchaseId: string;
  quotation: ApiRecord;
  quotations: ApiRecord[];
  quotationNumber: string;
  sale: ApiRecord;
  suggestedPaymentNumber: string;
  status: string;
  supplierId: number;
  unallocatedAmount: number;
};

type Envelope = {
  meta: { requestId: string; timestamp: string };
  success: boolean;
};

type SuccessEnvelope<T> = Envelope & {
  data: T;
  success: true;
};

type ErrorEnvelope = Envelope & {
  error: { code: string; message: string };
  success: false;
};
