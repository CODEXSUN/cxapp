import assert from "node:assert/strict";
import test from "node:test";
import { exportSaleLineItemSchema } from "../apps/billing/web/src/modules/export-sales/export-sales.schema";
import { paymentSchema } from "../apps/billing/web/src/modules/payment/payment.schema";
import { purchaseLineSchema } from "../apps/billing/web/src/modules/purchase/purchase.schema";
import { quotationLineSchema } from "../apps/billing/web/src/modules/quotation/quotation.schema";
import { receiptSchema } from "../apps/billing/web/src/modules/receipt/receipt.schema";
import { saleLineItemSchema } from "../apps/billing/web/src/modules/sales/sales.schema";

const line = {
  colour: "",
  colourId: null,
  dcNo: "",
  description: "",
  hsnCode: "9983",
  hsnCodeId: null,
  poNo: "",
  productId: null,
  productName: "Decimal item",
  quantity: "1.2500",
  rate: ".75",
  size: "",
  sizeId: null,
  taxId: null,
  taxRate: "18.5",
  unit: "Nos",
  unitId: 1
};

test("document line schemas accept and preserve decimal text", () => {
  for (const [name, schema] of [
    ["quotation", quotationLineSchema],
    ["sales", saleLineItemSchema],
    ["purchase", purchaseLineSchema],
    ["export sales", exportSaleLineItemSchema]
  ] as const) {
    const result = schema.safeParse(line);
    assert.equal(result.success, true, `${name}: ${JSON.stringify(result.error?.issues ?? [])}`);
    if (!result.success) continue;
    assert.equal(result.data.quantity, "1.2500");
    assert.equal(result.data.rate, ".75");
  }
});

test("receipt and payment schemas accept decimal amount and allocation text", () => {
  const common = {
    allocations: [{ allocatedAmount: "25.125", saleId: "a1b2c3d4" }],
    amount: "100.50",
    companyId: 1,
    currencyId: 1,
    discountAmount: ".25",
    financialYearId: 1,
    ledgerId: 1,
    notes: "",
    receiptDate: "2026-07-31",
    receiptMode: "bank",
    receiptNumber: "REC-1",
    referenceDate: "",
    referenceNo: "",
    roundOff: "-.005",
    tdsAmount: "1.75"
  } as const;
  const receipt = receiptSchema.safeParse({ ...common, customerId: 1 });
  assert.equal(receipt.success, true);
  if (receipt.success) assert.equal(receipt.data.amount, "100.50");

  const payment = paymentSchema.safeParse({
    ...common,
    allocations: [{ allocatedAmount: "25.125", purchaseId: "a1b2c3d4" }],
    paymentDate: common.receiptDate,
    paymentMode: common.receiptMode,
    paymentNumber: "PAY-1",
    supplierId: 1
  });
  assert.equal(payment.success, true);
  if (payment.success) assert.equal(payment.data.amount, "100.50");
});
