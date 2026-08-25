import assert from "node:assert/strict";
import test from "node:test";
import { authTokenKeyId, deriveAuthTokenKey } from "./auth-token-key.js";

test("derives isolated signing keys for platform and each tenant", () => {
  const platformKeyId = authTokenKeyId({ userType: "super_admin" });
  const altexKeyId = authTokenKeyId({ tenantId: "tenant-altex", userType: "tenant" });
  const cottonKeyId = authTokenKeyId({ tenantId: "tenant-cotton", userType: "tenant" });

  assert.equal(platformKeyId, "platform.v1");
  assert.equal(altexKeyId, "tenant.tenant-altex.v1");
  assert.equal(cottonKeyId, "tenant.tenant-cotton.v1");
  assert.notDeepEqual(deriveAuthTokenKey("root-secret", altexKeyId), deriveAuthTokenKey("root-secret", cottonKeyId));
  assert.notDeepEqual(deriveAuthTokenKey("root-secret", platformKeyId), deriveAuthTokenKey("root-secret", altexKeyId));
});

test("derived tenant keys are deterministic for parallel sessions of one tenant", () => {
  const keyId = authTokenKeyId({ tenantId: "tenant-altex", userType: "tenant" });
  assert.deepEqual(deriveAuthTokenKey("root-secret", keyId), deriveAuthTokenKey("root-secret", keyId));
});
