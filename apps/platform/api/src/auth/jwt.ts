import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { env } from "../env.js";

export type AuthUserType = "super_admin" | "staff" | "tenant";

export type AuthTokenPayload = {
  aud: "codexsun-platform";
  email: string;
  exp: number;
  iat: number;
  iss: "codexsun-platform-api";
  jti: string;
  name?: string;
  sessionIssuedAt: string;
  tenantCode?: string;
  tenantDbName?: string;
  tenantId?: string;
  tenantUuid?: string;
  userId: string;
  userType: AuthUserType;
};

export function signAuthToken(
  input: Omit<AuthTokenPayload, "aud" | "exp" | "iat" | "iss" | "jti" | "sessionIssuedAt">
) {
  const now = Math.floor(Date.now() / 1000);
  const payload: AuthTokenPayload = {
    ...input,
    aud: "codexsun-platform",
    exp: now + 60 * 60 * env.AUTH_SESSION_TTL_HOURS,
    iat: now,
    iss: "codexsun-platform-api",
    jti: randomUUID(),
    sessionIssuedAt: new Date(now * 1000).toISOString()
  };

  const header = { alg: "HS256", typ: "JWT" };
  const head = base64Url(JSON.stringify(header));
  const body = base64Url(JSON.stringify(payload));
  const signature = sign(`${head}.${body}`);
  return `${head}.${body}.${signature}`;
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [head, body, signature] = parts as [string, string, string];
  const expected = sign(`${head}.${body}`);
  if (!safeEqual(signature, expected)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as AuthTokenPayload;
    const now = Math.floor(Date.now() / 1000);
    if (
      payload.iss !== "codexsun-platform-api" ||
      payload.aud !== "codexsun-platform" ||
      payload.exp <= now
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function sign(value: string) {
  return createHmac("sha256", env.JWT_SECRET).update(value).digest("base64url");
}

function base64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
