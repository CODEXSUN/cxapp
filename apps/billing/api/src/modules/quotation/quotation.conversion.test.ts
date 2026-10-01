import assert from "node:assert/strict";
import test from "node:test";
import { QuotationRepository } from "./quotation.repository.js";
import { QuotationService } from "./quotation.service.js";
import type { Quotation } from "./quotation.types.js";

test("batch conversion rejects incompatible invoices before creating Sales", async () => {
  const first = quotation("00000001");
  for (const change of [
    { customerId: 2 },
    { currencyId: 2 },
    { taxType: "igst" as const },
    { billingAddressId: 2 },
    { terms: "Different terms" },
    { workOrderId: 2 },
    { companyId: 2 },
    { financialYearId: 2 }
  ]) {
    const second = { ...quotation("00000002"), ...change };
    class TestRepository extends QuotationRepository {
      override async get(_databaseName: string, id: string) {
        return id === first.id ? first : second;
      }
    }
    const service = new QuotationService(new TestRepository());
    await assert.rejects(
      service.convertManyToSale("unused-test-database", [first.id, second.id]),
      /same contact|matching company/
    );
  }
});

function quotation(id: string): Quotation {
  const address = {
    addressLine1: "",
    addressLine2: "",
    cityName: "",
    districtName: "",
    pincodeName: "",
    stateCode: "",
    stateName: ""
  };
  return {
    amount: 354,
    billingAddress: "",
    billingAddressDetails: address,
    billingAddressId: 1,
    billingStateCode: "",
    billingStateName: "",
    companyId: 1,
    companyName: "Test",
    createdAt: "",
    currencyCode: "INR",
    currencyId: 1,
    customerEmail: "",
    customerGstin: "",
    customerId: 1,
    customerName: "Test",
    customerPhone: "",
    date: "2026-10-01",
    financialYearId: 1,
    financialYearName: "2026-27",
    generatedSalesInvoiceNo: "",
    id,
    items: [],
    ledgerId: null,
    lineNumber: 1,
    notes: "",
    quotationNumber: id,
    roundOff: 0,
    salesLedger: "",
    shippingAddress: "",
    shippingAddressDetails: address,
    shippingAddressId: 1,
    shippingStateCode: "",
    shippingStateName: "",
    status: "draft",
    subtotal: 300,
    taxAmount: 54,
    taxType: "cgst-sgst",
    terms: "",
    updatedAt: "",
    workOrderId: null,
    workOrderNo: ""
  };
}
