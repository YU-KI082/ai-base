import { CSRF_COOKIE, CSRF_HEADER } from "@ai-base/auth/csrf";

export function readBrowserCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${name}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(name.length + 1));
}

/** Headers for admin mutating fetch calls (CSRF double-submit). */
export function adminMutationHeaders(
  extra?: Record<string, string>,
): Record<string, string> {
  const csrf = readBrowserCookie(CSRF_COOKIE);
  return {
    "Content-Type": "application/json",
    ...(csrf ? { [CSRF_HEADER]: csrf } : {}),
    ...extra,
  };
}
