import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { env } from "../env.js";

const cookieVersion = "v1";
const cookieAad = Buffer.from("codexsun.auth.session.v1", "utf8");
const legacyCookieNames = [
  "codexsun_session",
  "codexsun_session_admin",
  "codexsun_session_sa",
  "codexsun_session_tenant",
  "__Host-codexsun_session"
] as const;

export function authCookieName() {
  return env.NODE_ENV === "production" ? "__Host-codexsun_session" : "codexsun_session";
}

export function readEncryptedSessionCookie(request: FastifyRequest) {
  const value = request.cookies[authCookieName()];
  return value ? decryptSessionCookie(value) : "";
}

export function writeEncryptedSessionCookie(reply: FastifyReply, token: string) {
  if (env.AUTH_MODE === "jwt") return;
  clearAllSessionCookies(reply);
  reply.setCookie(authCookieName(), encryptSessionCookie(token), {
    httpOnly: true,
    maxAge: env.AUTH_SESSION_TTL_HOURS * 60 * 60,
    path: "/",
    sameSite: "strict",
    secure: env.NODE_ENV === "production"
  });
}

export function clearAllSessionCookies(reply: FastifyReply) {
  for (const name of legacyCookieNames) {
    reply.clearCookie(name, {
      httpOnly: true,
      path: "/",
      sameSite: "strict",
      secure: name.startsWith("__Host-") || env.NODE_ENV === "production"
    });
  }
}

export function encryptSessionCookie(token: string) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", cookieKey(), nonce);
  cipher.setAAD(cookieAad);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    cookieVersion,
    nonce.toString("base64url"),
    ciphertext.toString("base64url"),
    tag.toString("base64url")
  ].join(".");
}

export function decryptSessionCookie(value: string) {
  const [version, nonceValue, ciphertextValue, tagValue] = value.split(".");
  if (version !== cookieVersion || !nonceValue || !ciphertextValue || !tagValue) {
    return "";
  }
  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      cookieKey(),
      Buffer.from(nonceValue, "base64url")
    );
    decipher.setAAD(cookieAad);
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextValue, "base64url")),
      decipher.final()
    ]).toString("utf8");
  } catch {
    return "";
  }
}

function cookieKey() {
  return createHash("sha256").update(`codexsun:auth-cookie:${env.JWT_SECRET}`, "utf8").digest();
}
