import assert from "node:assert/strict";
import test from "node:test";
import { parseNumericTenantId } from "./tenant.repository.js";

test("accepts only complete positive decimal tenant IDs", () => {
  assert.equal(parseNumericTenantId("4"), 4);
  assert.equal(parseNumericTenantId("004"), 4);
  assert.equal(parseNumericTenantId("4b1f9aed"), null);
  assert.equal(parseNumericTenantId("4.1"), null);
  assert.equal(parseNumericTenantId("1e2"), null);
  assert.equal(parseNumericTenantId("0"), null);
});
