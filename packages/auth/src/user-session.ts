import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { createHmac } from "node:crypto";
import { USER_SESSION_COOKIE } from "./constants.js";
import { readCookie } from "./csrf.js";
import { AuthError } from "./types.js";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function sessionSecret(): string {
  return (
    process.env.USER_SESSION_SECRET?.trim() ||
    process.env.TOKEN_ENCRYPTION_KEY?.trim() ||
    process.env.ADMIN_OPS_SECRET?.trim() ||
    "dev-user-session-secret-change-me"
  );
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [algo, salt, hash] = stored.split("$");
  if (algo !== "scrypt" || !salt || !hash) return false;
  const next = scryptSync(password, salt, 64);
  const prev = Buffer.from(hash, "hex");
  if (prev.length !== next.length) return false;
  return timingSafeEqual(prev, next);
}

export type UserSessionPayload = {
  userId: string;
  email: string;
  exp: number;
};

export function createUserSessionToken(input: {
  userId: string;
  email: string;
}): string {
  const payload: UserSessionPayload = {
    userId: input.userId,
    email: input.email.toLowerCase(),
    exp: Date.now() + SESSION_TTL_MS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", sessionSecret()).update(body).digest("base64url");
  return `usr.v1.${body}.${sig}`;
}

export function verifyUserSessionToken(
  token: string | null | undefined,
): UserSessionPayload | null {
  if (!token?.startsWith("usr.v1.")) return null;
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const body = parts[2]!;
  const sig = parts[3]!;
  const expected = createHmac("sha256", sessionSecret())
    .update(body)
    .digest("base64url");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as UserSessionPayload;
    if (!payload.userId || !payload.email || !payload.exp) return null;
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function extractUserSessionToken(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer usr.v1.")) {
    return auth.slice("Bearer ".length).trim();
  }
  return readCookie(request, USER_SESSION_COOKIE);
}

export function userSessionCookieHeader(token: string, maxAgeSec = 30 * 24 * 3600): string {
  const secure = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
  return `${USER_SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${secure ? "; Secure" : ""}`;
}

export function clearUserSessionCookieHeader(): string {
  return `${USER_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

/** Fingerprint helper for rate limiting (no PII beyond hash). */
export function emailFingerprint(email: string): string {
  return createHash("sha256").update(email.toLowerCase()).digest("hex").slice(0, 16);
}
