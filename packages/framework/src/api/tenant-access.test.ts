import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { AppError } from "../errors/app-error.js";
import { authTokenKeyId, deriveAuthTokenKey } from "./auth-token-key.js";
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

test("accepts a tenant-scoped Platform token for the matching tenant database", () => {
  const secret = "test-secret";
  const tenantId = "tenant-altex";
  const tenantDatabase = "altex_db";
  const authorization = `Bearer ${signTenantToken({ secret, tenantDatabase, tenantId })}`;

  const claims = requireTenantAccess({
    authorization,
    secret,
    tenantDatabase,
    tenantId
  });

  assert.equal(claims.tenantId, tenantId);
  assert.equal(claims.tenantDbName, tenantDatabase);
  assert.equal(claims.userType, "tenant");
});

test("rejects a tenant-scoped Platform token for another tenant database", () => {
  const secret = "test-secret";
  const tenantId = "tenant-altex";
  const authorization = `Bearer ${signTenantToken({
    secret,
    tenantDatabase: "altex_db",
    tenantId
  })}`;

  assert.throws(
    () =>
      requireTenantAccess({
        authorization,
        secret,
        tenantDatabase: "cotton_db",
        tenantId
      }),
    (error) => error instanceof AppError && error.statusCode === 403
  );
});

function signTenantToken(input: { secret: string; tenantDatabase: string; tenantId: string }) {
  const claims = {
    aud: "cxapp-platform",
    email: "admin@example.com",
    exp: Math.floor(Date.now() / 1000) + 3600,
    iss: "cxapp-platform-api",
    tenantDbName: input.tenantDatabase,
    tenantId: input.tenantId,
    userId: "user-1",
    userType: "tenant" as const
  };
  const keyId = authTokenKeyId(claims);
  const head = Buffer.from(JSON.stringify({ alg: "HS256", kid: keyId, typ: "at+jwt" })).toString(
    "base64url"
  );
  const body = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = createHmac("sha256", deriveAuthTokenKey(input.secret, keyId))
    .update(`${head}.${body}`)
    .digest("base64url");
  return `${head}.${body}.${signature}`;
}
