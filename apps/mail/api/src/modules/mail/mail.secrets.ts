import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export function encryptMailSecret(value: string, secretKey: string) {
  if (!value) return "";
  const key = createHash("sha256").update(secretKey).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [
    "v1",
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    encrypted.toString("base64")
  ].join(".");
}

export function decryptMailSecret(value: unknown, secretKey: string) {
  const encoded = String(value ?? "");
  if (!encoded) return "";
  const [version, iv, tag, encrypted] = encoded.split(".");
  if (version !== "v1" || !iv || !tag || !encrypted) return encoded;
  const key = createHash("sha256").update(secretKey).digest();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64")),
    decipher.final()
  ]).toString("utf8");
}
