import assert from "node:assert/strict";
import { test } from "node:test";
import { buildCustomerStatementAgeing } from "./customer-statement.ageing.js";

test("customer ageing assigns each exact day boundary", () => {
  for (const [date, index] of [
    ["2026-10-01", 0],
    ["2026-09-01", 0],
    ["2026-08-31", 1],
    ["2026-08-02", 1],
    ["2026-08-01", 2],
    ["2026-07-03", 2],
    ["2026-07-02", 3]
  ] as const) {
    const result = buildCustomerStatementAgeing([{ date, amount: 12.34 }], 0, 0, 0, "2026-10-01");
    assert.equal(result.buckets[index]?.amount, 12.34);
    assert.equal(result.total, 12.34);
  }
});

test("customer ageing conserves cents across 300 deterministic scenarios without mutating invoices", () => {
  for (let seed = 0; seed < 300; seed++) {
    const invoices = [
      { date: "2026-09-15", amount: ((seed * 37) % 10001) / 100 },
      { date: "2026-07-01", amount: ((seed * 71) % 10001) / 100 },
      { date: "2026-10-02", amount: 99999 }
    ];
    const original = structuredClone(invoices);
    const opening = (((seed * 53) % 20001) - 10000) / 100;
    const credit = ((seed * 97) % 20001) / 100;
    const result = buildCustomerStatementAgeing(invoices, opening, credit, 42.17, "2026-10-01");
    const expected =
      Math.round(opening * 100) +
      Math.round(invoices[0]!.amount * 100) +
      Math.round(invoices[1]!.amount * 100) -
      Math.round(credit * 100);
    assert.equal(Math.round(result.total * 100), expected);
    assert.equal(result.reservedAmount, 42.17);
    assert.ok(result.buckets.every((bucket) => bucket.amount >= 0));
    assert.deepEqual(invoices, original);
    assert.deepEqual(
      buildCustomerStatementAgeing([...invoices].reverse(), opening, credit, 42.17, "2026-10-01"),
      result
    );
  }
});

test("customer ageing boundaries, credits, openings, and reservations reconcile", () => {
  const result = buildCustomerStatementAgeing(
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
  const advance = buildCustomerStatementAgeing(
    [{ date: "2026-09-01", amount: 10.01 }],
    -20,
    5,
    0,
    "2026-10-01"
  );
  assert.equal(advance.creditBalance, 14.99);
  assert.equal(advance.total, -14.99);
  assert.equal(buildCustomerStatementAgeing([], 30, 10, 0, "2026-10-01").undatedOpening, 20);
});
