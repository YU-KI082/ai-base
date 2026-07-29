import { createHmac, timingSafeEqual } from "node:crypto";
import { SESSION_COOKIE } from "./constants.js";
import { readCookie } from "./csrf.js";

export { SESSION_COOKIE };

function opsSecret(): string | null {
  const secret = process.env.ADMIN_OPS_SECRET?.trim();
  return secret && secret.length >= 8 ? secret : null;
}

/** Create a signed ops session token for ADMIN_OPS_SECRET. */
export function createOpsSessionToken(): string | null {
  const secret = opsSecret();
  if (!secret) return null;
  const sig = createHmac("sha256", secret).update("aibase-ops-v1").digest("hex");
  return `ops.v1.${sig}`;
}

export function verifyOpsSessionToken(token: string | null | undefined): boolean {
  if (!token) return false;
  const expected = createOpsSessionToken();
  if (!expected) return false;
  try {
    const a = Buffer.from(token);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Accept Bearer ADMIN_OPS_SECRET or cookie session. */
export function extractOpsCredential(request?: Request): string | null {
  if (!request) return null;
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    const bearer = auth.slice("Bearer ".length).trim();
    const secret = opsSecret();
    if (secret && bearer === secret) return bearer;
    if (verifyOpsSessionToken(bearer)) return bearer;
  }
  return readCookie(request, SESSION_COOKIE);
}

export function isOpsAuthConfigured(): boolean {
  return Boolean(opsSecret());
}
