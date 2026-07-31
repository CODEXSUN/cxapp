import assert from "node:assert/strict";
import test from "node:test";
import { AppError } from "../errors/app-error.js";
import { requirePlatformAccess, requireTenantAccess } from "./tenant-access.js";

test("missing and invalid platform credentials use the explicit session-expired contract", () => {
  for (const authorization of [undefined, "Bearer invalid"] as const) {
    assert.throws(
      () => requirePlatformAccess({ authorization, secret: "test-secret" }),
      (error) =>
        error instanceof AppError &&
        error.statusCode === 401 &&
        error.code === "AUTH_SESSION_EXPIRED"
    );
  }
});

test("missing tenant context is distinct from an expired session", () => {
  assert.throws(
    () =>
      requireTenantAccess({
        authorization: undefined,
        secret: "test-secret",
        tenantDatabase: "tenant_db",
        tenantId: undefined
      }),
    (error) => error instanceof AppError && error.code === "AUTH_SESSION_EXPIRED"
  );
});
