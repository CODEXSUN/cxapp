import assert from "node:assert/strict";
import test from "node:test";
import { availableReceiptCandidates } from "./receipt.allocation";
import type { Receipt, ReceiptAllocationCandidate } from "./receipt.types";

test("receipt allocation candidates enforce party and currency and restore only their own reservation", () => {
  const candidate: ReceiptAllocationCandidate = {
    currencyId: 1,
    customerId: 2,
    documentDate: "2026-10-01",
    documentNo: "TEST-1",
    documentTotal: 100,
    outstandingAmount: 60,
    saleId: "abcd1234"
  };
  const entry: Pick<Receipt, "customerId" | "currencyId" | "allocations" | "status"> = {
    currencyId: 1,
    customerId: 2,
    status: "draft",
    allocations: [{ ...candidate, allocatedAmount: 25, id: "1234abcd", previousBalance: 100 }]
  };
  assert.equal(availableReceiptCandidates([candidate], 2, 1, entry)[0]?.outstandingAmount, 85);
  assert.equal(
    availableReceiptCandidates([candidate], 2, 1, { ...entry, status: "cancelled" })[0]
      ?.outstandingAmount,
    60
  );
  assert.deepEqual(availableReceiptCandidates([candidate], 3, 1, entry), []);
  assert.deepEqual(availableReceiptCandidates([], 2, 1, { ...entry, status: "cancelled" }), []);
  assert.deepEqual(availableReceiptCandidates([candidate], 2, 3, entry), []);
  assert.equal(availableReceiptCandidates([], 2, 1, entry)[0]?.outstandingAmount, 25);
  assert.equal(availableReceiptCandidates([candidate], 2, 1)[0]?.outstandingAmount, 60);
  const exportCandidate: ReceiptAllocationCandidate = { ...candidate, documentKind: "export-sale" };
  const mixed = availableReceiptCandidates([candidate, exportCandidate], 2, 1, entry);
  assert.equal(mixed.length, 2);
  assert.equal(mixed.find((item) => item.documentKind === "export-sale")?.outstandingAmount, 60);
});
