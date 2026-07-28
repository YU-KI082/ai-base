/**
 * Environment gates for auth. Production must never rely on ADMIN_DEV_BYPASS.
 */

export function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Dev bypass is allowed only when ALL of:
 * - NODE_ENV is not production
 * - ADMIN_DEV_BYPASS === "true"
 * - ADMIN_DEV_BYPASS_FORCE is not required to be unset in prod (already gated)
 */
export function isAdminDevBypassEnabled(): boolean {
  if (isProductionRuntime()) {
    return false;
  }
  return process.env.ADMIN_DEV_BYPASS === "true";
}

/**
 * Optional host check for bypass: when ADMIN_DEV_BYPASS_LOCALHOST_ONLY=true
 * (default), only loopback Host / X-Forwarded-For is accepted.
 */
export function isLocalDevRequest(request?: Request): boolean {
  if (process.env.ADMIN_DEV_BYPASS_LOCALHOST_ONLY === "false") {
    return true;
  }
  if (!request) {
    // Server Components / no Request: allow only when bypass is on (local SSR).
    return true;
  }

  const url = new URL(request.url);
  const hostname = url.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "[::1]"
  ) {
    return true;
  }

  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded === "127.0.0.1" || forwarded === "::1") {
    return true;
  }

  return false;
}
