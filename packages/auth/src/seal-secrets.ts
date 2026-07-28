import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const PREFIX = "v1";

function deriveKey(secret: string): Buffer {
  return scryptSync(secret, "aibase-token-seal-v1", 32);
}

function encryptionKey(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY?.trim();
  if (!raw || raw.length < 32) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY must be set (32+ characters) to encrypt SNS OAuth tokens",
    );
  }
  return deriveKey(raw);
}

/** AES-256-GCM seal. Output: v1.<iv_b64>.<tag_b64>.<cipher_b64> */
export function sealSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    PREFIX,
    iv.toString("base64url"),
    tag.toString("base64url"),
    enc.toString("base64url"),
  ].join(".");
}

export function openSecret(sealed: string): string {
  const [version, ivB64, tagB64, dataB64] = sealed.split(".");
  if (version !== PREFIX || !ivB64 || !tagB64 || !dataB64) {
    throw new Error("Invalid sealed secret format");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivB64, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function isTokenEncryptionConfigured(): boolean {
  const raw = process.env.TOKEN_ENCRYPTION_KEY?.trim();
  return Boolean(raw && raw.length >= 32);
}
