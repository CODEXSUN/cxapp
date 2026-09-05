import { createHmac, timingSafeEqual } from "node:crypto";
import { AppError } from "../errors/app-error.js";
import { authTokenKeyId, deriveAuthTokenKey } from "./auth-token-key.js";

export type PlatformAccessClaims = {
  aud?: string;
  email?: string;
  exp?: number;
  iss?: string;
  name?: string;
  sessionIssuedAt?: string;
  tenantCode?: string;
  tenantDbName?: string;
  tenantId?: string;
  tenantUuid?: string;
  userId?: string;
  userType?: string;
};

export type PlatformUserType = "super_admin" | "staff" | "tenant";

export function requirePlatformAccess(input: {
  allowedUserTypes?: readonly PlatformUserType[];
  authorization: string | string[] | undefined;
  secret: string;
}) {
  const authorization = headerValue(input.authorization);
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw sessionExpired("Platform authentication is required.");

  const claims = verify(token, input.secret);
  if (!claims) throw sessionExpired("Platform session is invalid or expired.");
  if (
    input.allowedUserTypes &&
    !input.allowedUserTypes.includes(claims.userType as PlatformUserType)
  ) {
    throw AppError.forbidden("This Platform session cannot access the requested application desk.");
  }
  return claims;
}

export function requireTenantAccess(input: {
  authorization: string | string[] | undefined;
  secret: string;
  tenantDatabase: string;
  tenantId: string | string[] | undefined;
}) {
  const claims = requirePlatformAccess({
    allowedUserTypes: ["tenant"],
    authorization: input.authorization,
    secret: input.secret
  });
  const tenantId = headerValue(input.tenantId);
  if (!tenantId) {
    throw new AppError({
      code: "AUTH_TENANT_CONTEXT_MISSING",
      message: "Tenant authentication context is required.",
      statusCode: 401
    });
  }
  if (
    claims.userType !== "tenant" ||
    claims.tenantId !== tenantId ||
    claims.tenantDbName !== input.tenantDatabase
  ) {
    throw AppError.forbidden("Tenant session does not match the requested tenant database.");
  }
  return claims;
}

/**
 * Compatibility bridge for packages published before the host-adapter contract.
 * New add-ons must receive authorization and tenant context from their host.
 */
export function requireApplicationAccess(input: {
  applicationDatabase: string;
  authorization: string | string[] | undefined;
  secret: string;
}) {
  const claims = requirePlatformAccess({
    allowedUserTypes: ["tenant"],
    authorization: input.authorization,
    secret: input.secret
  });
  if (!claims.tenantId || claims.tenantDbName !== input.applicationDatabase) {
    throw AppError.forbidden("Application session does not match this database runtime.");
  }
  return claims;
}

function sessionExpired(message: string) {
  return new AppError({ code: "AUTH_SESSION_EXPIRED", message, statusCode: 401 });
}

function verify(token: string, secret: string): PlatformAccessClaims | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [head, body, signature] = parts as [string, string, string];
  try {
    const header = JSON.parse(Buffer.from(head, "base64url").toString("utf8")) as {
      alg?: unknown;
      kid?: unknown;
      typ?: unknown;
    };
    const claims = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8")
    ) as PlatformAccessClaims;
    if (!isUserType(claims.userType)) return null;
    const keyId = authTokenKeyId({
      ...(claims.tenantId ? { tenantId: claims.tenantId } : {}),
      userType: claims.userType
    });
    if (header.alg !== "HS256" || header.kid !== keyId || header.typ !== "at+jwt") return null;
    const expected = createHmac("sha256", deriveAuthTokenKey(secret, keyId))
      .update(`${head}.${body}`)
      .digest("base64url");
    if (!safeEqual(signature, expected)) return null;
    if (
      claims.iss !== "cxapp-platform-api" ||
      claims.aud !== "cxapp-platform" ||
      typeof claims.exp !== "number" ||
      claims.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return claims;
  } catch {
    return null;
  }
}

function isUserType(value: unknown): value is PlatformUserType {
  return value === "tenant" || value === "staff" || value === "super_admin";
}

function headerValue(value: string | string[] | undefined) {
  const selected = Array.isArray(value) ? value[0] : value;
  return selected?.trim() || undefined;
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
