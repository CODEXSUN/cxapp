import assert from "node:assert/strict";
import test from "node:test";
import { buildExportSaleTotals } from "./export-sales.service.js";

test("export-sales tax components reconcile for odd cents and multiple lines", () => {
  const input = {
    billingAddress: "",
    billingAddressId: 1,
    companyId: 1,
    currencyCode: "INR",
    currencyId: 1,
    customerEmail: "",
    customerId: 1,
    customerName: "Test",
    customerPhone: "",
    supplierEmail: "",
    supplierId: 1,
    supplierName: "Test",
    supplierPhone: "",
    date: "2026-10-01",
    issuedOn: "2026-10-01",
    financialYearId: 1,
    invoiceNumber: "TEST-1",
    quotationNumber: "TEST-1",
    ledgerId: null,
    notes: "",
    roundOff: 0,
    shippingAddress: "",
    shippingAddressId: 1,
    status: "draft" as const,
    workOrderId: null,
    items: [
      {
        colourId: null,
        description: "Test",
        hsnCode: "",
        hsnCodeId: null,
        productId: null,
        quantity: 2.5,
        rate: 99.95,
        sizeId: null,
        taxId: null,
        taxRate: 5,
        unit: "Nos",
        unitId: 1
      }
    ]
  };
  for (const taxType of ["cgst-sgst", "igst"] as const) {
    const totals = buildExportSaleTotals({ ...input, taxType });
    const line = totals.items[0]!;
    assert.equal(line.taxableAmount, 249.88);
    assert.equal(line.taxAmount, 12.49);
    assert.equal(Math.round((line.cgstAmount + line.sgstAmount + line.igstAmount) * 100), 1249);
    assert.equal(totals.amount, 262.37);
    const multiple = buildExportSaleTotals({
      ...input,
      taxType,
      items: [input.items[0]!, input.items[0]!]
    });
    assert.equal(multiple.taxAmount, 24.98);
    assert.equal(multiple.amount, 524.74);
  }
});
