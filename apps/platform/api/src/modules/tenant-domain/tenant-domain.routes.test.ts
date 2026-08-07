import assert from "node:assert/strict";
import test from "node:test";
import { tenantDomainUuidParamsSchema } from "./tenant-domain.routes.js";

test("accepts only complete lowercase tenant-domain UUIDs", () => {
  assert.deepEqual(tenantDomainUuidParamsSchema.parse({ uuid: "4b1f9aed" }), {
    uuid: "4b1f9aed"
  });
  assert.equal(tenantDomainUuidParamsSchema.safeParse({ uuid: "4" }).success, false);
  assert.equal(tenantDomainUuidParamsSchema.safeParse({ uuid: "4b1f9ae" }).success, false);
  assert.equal(tenantDomainUuidParamsSchema.safeParse({ uuid: "4B1F9AED" }).success, false);
  assert.equal(tenantDomainUuidParamsSchema.safeParse({ uuid: "4b1f9aed0" }).success, false);
});
