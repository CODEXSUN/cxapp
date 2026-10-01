import assert from "node:assert/strict";
import test from "node:test";
import { availablePaymentCandidates } from "./payment.allocation";
import type { Payment, PaymentAllocationCandidate } from "./payment.types";

test("payment allocation candidates enforce party and currency and restore only their own reservation", () => {
  const candidate: PaymentAllocationCandidate = {
    currencyId: 1,
    supplierId: 2,
    documentDate: "2026-10-01",
    documentNo: "TEST-1",
    documentTotal: 100,
    outstandingAmount: 60,
    purchaseId: "abcd1234"
  };
  const entry: Pick<Payment, "supplierId" | "currencyId" | "allocations" | "status"> = {
    currencyId: 1,
    supplierId: 2,
    status: "draft",
    allocations: [{ ...candidate, allocatedAmount: 25, id: "1234abcd", previousBalance: 100 }]
  };
  assert.equal(availablePaymentCandidates([candidate], 2, 1, entry)[0]?.outstandingAmount, 85);
  assert.equal(
    availablePaymentCandidates([candidate], 2, 1, { ...entry, status: "cancelled" })[0]
      ?.outstandingAmount,
    60
  );
  assert.deepEqual(availablePaymentCandidates([candidate], 3, 1, entry), []);
  assert.deepEqual(
    availablePaymentCandidates([], 2, 1, { ...entry, status: "cancelled" }),
    []
  );
  assert.deepEqual(availablePaymentCandidates([candidate], 2, 3, entry), []);
  assert.equal(availablePaymentCandidates([], 2, 1, entry)[0]?.outstandingAmount, 25);
  assert.equal(availablePaymentCandidates([candidate], 2, 1)[0]?.outstandingAmount, 60);
});
