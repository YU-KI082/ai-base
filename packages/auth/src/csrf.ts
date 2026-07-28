import { randomBytes, timingSafeEqual } from "node:crypto";

export const CSRF_COOKIE = "aibase_csrf";
export const CSRF_HEADER = "x-csrf-token";

export function createCsrfToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Double-submit CSRF: cookie value must equal header token.
 * Cookie is intentionally readable by JS (not HttpOnly) so the SPA can
 * mirror it into `x-csrf-token`. SameSite=Strict mitigates cross-site sends.
 */
export function verifyCsrf(input: {
  cookieToken?: string | null;
  headerToken?: string | null;
}): boolean {
  const cookie = input.cookieToken?.trim();
  const header = input.headerToken?.trim();
  if (!cookie || !header) return false;
  if (cookie.length < 16 || header.length < 16) return false;
  const a = Buffer.from(cookie);
  const b = Buffer.from(header);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function readCookie(request: Request, name: string): string | null {
  const raw = request.headers.get("cookie");
  if (!raw) return null;
  for (const part of raw.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export function csrfCookieHeader(token: string, secure: boolean): string {
  const parts = [
    `${CSRF_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "SameSite=Strict",
    ...(secure ? ["Secure"] : []),
    "Max-Age=86400",
  ];
  return parts.join("; ");
}
