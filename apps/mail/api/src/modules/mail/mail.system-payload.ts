import { decryptMailSecret, encryptMailSecret } from "./mail.secrets.js";

const encryptedPayloadKey = "encryptedSystemMail";

export function sealSystemMailPayload(
  payload: Record<string, unknown>,
  secretKey: string
): Record<string, unknown> {
  return {
    [encryptedPayloadKey]: encryptMailSecret(JSON.stringify(payload), secretKey)
  };
}

export function openSystemMailPayload(
  payload: Record<string, unknown>,
  secretKey: string
): Record<string, unknown> {
  const encrypted = payload[encryptedPayloadKey];
  if (!encrypted) return payload;
  const parsed = JSON.parse(decryptMailSecret(encrypted, secretKey));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Encrypted system mail payload is invalid.");
  }
  return parsed as Record<string, unknown>;
}
