import { timingSafeEqual, randomBytes } from "node:crypto";
import { CSRF_COOKIE } from "./constants.js";

export { CSRF_COOKIE, CSRF_HEADER } from "./constants.js";
export { createCsrfTokenEdge } from "./csrf-edge.js";

/** Node/runtime token (API routes, Node server). */
export function createCsrfToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Double-submit CSRF: cookie value must equal header token.
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
