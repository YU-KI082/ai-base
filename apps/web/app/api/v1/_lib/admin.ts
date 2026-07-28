import {
  AuthError,
  CSRF_COOKIE,
  CSRF_HEADER,
  adminMutationLimiter,
  clientKey,
  hasPermission,
  isAdminDevBypassEnabled,
  readCookie,
  requireAdmin,
  verifyCsrf,
  type AuthUser,
} from "@ai-base/auth";
import { jsonError } from "./http";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function enforceCsrf(request: Request): Response | null {
  if (SAFE_METHODS.has(request.method.toUpperCase())) {
    return null;
  }
  // Machine clients authenticating with Bearer skip cookie CSRF.
  if (request.headers.get("authorization")?.startsWith("Bearer ")) {
    return null;
  }
  const cookieToken = readCookie(request, CSRF_COOKIE);
  const headerToken = request.headers.get(CSRF_HEADER);
  if (!verifyCsrf({ cookieToken, headerToken })) {
    return jsonError("CSRF token missing or invalid", 403);
  }
  return null;
}

function enforceRateLimit(request: Request): Response | null {
  if (SAFE_METHODS.has(request.method.toUpperCase())) {
    return null;
  }
  const result = adminMutationLimiter.check(clientKey(request, "admin-mut"));
  if (!result.allowed) {
    return jsonError("Rate limit exceeded", 429);
  }
  return null;
}

export async function withAdmin(
  request: Request,
  permission: string,
  handler: (user: AuthUser) => Promise<Response>,
): Promise<Response> {
  try {
    const rateLimited = enforceRateLimit(request);
    if (rateLimited) return rateLimited;

    const csrfBlocked = enforceCsrf(request);
    if (csrfBlocked) return csrfBlocked;

    const user = await requireAdmin(request);
    if (!hasPermission(user, permission)) {
      return jsonError("Forbidden", 403);
    }
    return await handler(user);
  } catch (error) {
    if (error instanceof AuthError) {
      return jsonError(error.message, error.status);
    }
    const message = error instanceof Error ? error.message : String(error);
    const status = message.includes("Unauthorized") ? 401 : 500;
    return jsonError(message, status);
  }
}

/** Expose auth mode for diagnostics without leaking secrets. */
export function adminAuthMode(): "dev_bypass" | "ops_secret" | "unconfigured" {
  if (isAdminDevBypassEnabled()) return "dev_bypass";
  if (process.env.ADMIN_OPS_SECRET?.trim()) return "ops_secret";
  return "unconfigured";
}
