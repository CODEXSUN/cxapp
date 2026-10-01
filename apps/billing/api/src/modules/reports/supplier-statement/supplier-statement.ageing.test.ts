import assert from "node:assert/strict";
import { test } from "node:test";
import { buildSupplierStatementAgeing } from "./supplier-statement.ageing.js";

test("supplier ageing boundaries, credits, openings, and reservations reconcile", () => {
  const result = buildSupplierStatementAgeing(
    [
      { date: "2026-10-01", amount: 100 },
      { date: "2026-09-01", amount: 100 },
      { date: "2026-08-31", amount: 100 },
      { date: "2026-08-02", amount: 100 },
      { date: "2026-08-01", amount: 100 },
      { date: "2026-07-03", amount: 100 },
      { date: "2026-07-02", amount: 100 },
      { date: "2026-10-02", amount: 999 }
    ],
    50,
    150,
    70,
    "2026-10-01"
  );
  assert.deepEqual(
    result.buckets.map((bucket) => bucket.amount),
    [200, 200, 200, 0]
  );
  assert.equal(result.undatedOpening, 0);
  assert.equal(result.total, 600);
  assert.equal(result.reservedAmount, 70);
  const advance = buildSupplierStatementAgeing(
    [{ date: "2026-09-01", amount: 10.01 }],
    -20,
    5,
    0,
    "2026-10-01"
  );
  assert.equal(advance.creditBalance, 14.99);
  assert.equal(advance.total, -14.99);
  assert.equal(buildSupplierStatementAgeing([], 30, 10, 0, "2026-10-01").undatedOpening, 20);
});
