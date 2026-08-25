import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { env } from "../env.js";
import { authTokenKeyId, deriveAuthTokenKey } from "./auth-token-key.js";

export { authTokenKeyId } from "./auth-token-key.js";

export type AuthUserType = "super_admin" | "staff" | "tenant";
export type TenantAccessMode = "custom_domain" | "platform" | "shared_domain";

export type AuthTokenPayload = {
  aud: "cxapp-platform";
  email: string;
  exp: number;
  iat: number;
  iss: "cxapp-platform-api";
  jti: string;
  loginHost: string;
  name?: string;
  sessionIssuedAt: string;
  sub: string;
  tenantAccessMode: TenantAccessMode;
  tenantCode?: string;
  tenantDbName?: string;
  tenantId?: string;
  tenantUuid?: string;
  userId: string;
  userType: AuthUserType;
};

export function signAuthToken(
  input: Omit<
    AuthTokenPayload,
    | "aud"
    | "exp"
    | "iat"
    | "iss"
    | "jti"
    | "loginHost"
    | "sessionIssuedAt"
    | "sub"
    | "tenantAccessMode"
  > & { loginHost?: string; tenantAccessMode?: TenantAccessMode },
  options: { jti?: string; sessionIssuedAt?: string } = {}
) {
  const now = Math.floor(Date.now() / 1000);
  const payload: AuthTokenPayload = {
    ...input,
    aud: "cxapp-platform",
    exp: now + 60 * 60 * env.AUTH_SESSION_TTL_HOURS,
    iat: now,
    iss: "cxapp-platform-api",
    jti: options.jti ?? randomUUID(),
    loginHost: input.loginHost ?? "",
    sessionIssuedAt: options.sessionIssuedAt ?? new Date(now * 1000).toISOString(),
    sub: `${input.userType}:${input.userId}`,
    tenantAccessMode:
      input.tenantAccessMode ?? (input.userType === "tenant" ? "shared_domain" : "platform")
  };

  const keyId = authTokenKeyId(payload);
  const header = { alg: "HS256", kid: keyId, typ: "at+jwt" };
  const head = base64Url(JSON.stringify(header));
  const body = base64Url(JSON.stringify(payload));
  const signature = sign(`${head}.${body}`, keyId);
  return `${head}.${body}.${signature}`;
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [head, body, signature] = parts as [string, string, string];
  try {
    const header = JSON.parse(Buffer.from(head, "base64url").toString("utf8")) as {
      alg?: unknown;
      kid?: unknown;
      typ?: unknown;
    };
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as AuthTokenPayload;
    const keyId = authTokenKeyId(payload);
    if (header.kid !== keyId || !safeEqual(signature, sign(`${head}.${body}`, keyId))) return null;
    const now = Math.floor(Date.now() / 1000);
    if (
      header.alg !== "HS256" ||
      header.typ !== "at+jwt" ||
      payload.iss !== "cxapp-platform-api" ||
      payload.aud !== "cxapp-platform" ||
      typeof payload.exp !== "number" ||
      payload.exp <= now ||
      typeof payload.jti !== "string" ||
      !payload.jti ||
      payload.sub !== `${payload.userType}:${payload.userId}` ||
      !isUserType(payload.userType) ||
      !isTenantAccessMode(payload.tenantAccessMode) ||
      typeof payload.loginHost !== "string"
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function isUserType(value: unknown): value is AuthUserType {
  return value === "tenant" || value === "staff" || value === "super_admin";
}

function isTenantAccessMode(value: unknown): value is TenantAccessMode {
  return value === "custom_domain" || value === "platform" || value === "shared_domain";
}

function sign(value: string, keyId: string) {
  const derivedKey = deriveAuthTokenKey(env.JWT_SECRET, keyId);
  return createHmac("sha256", derivedKey).update(value).digest("base64url");
}

function base64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
