export type { AuthUser } from "./types.js";
export { AuthError } from "./types.js";
export { requireAdmin, tryRequireAdmin } from "./require-admin.js";
export { requireUser, tryRequireUser, type OsUserContext } from "./require-user.js";
export { hasPermission, hasAnyPermission } from "./rbac.js";
export {
  isAdminDevBypassEnabled,
  isLocalDevRequest,
  isProductionRuntime,
} from "./env.js";
export {
  CSRF_COOKIE,
  CSRF_HEADER,
  SESSION_COOKIE,
  USER_SESSION_COOKIE,
} from "./constants.js";
export {
  createCsrfToken,
  createCsrfTokenEdge,
  verifyCsrf,
  readCookie,
  csrfCookieHeader,
} from "./csrf.js";
export {
  createOpsSessionToken,
  verifyOpsSessionToken,
  isOpsAuthConfigured,
  extractOpsCredential,
} from "./ops-session.js";
export {
  hashPassword,
  verifyPassword,
  createUserSessionToken,
  verifyUserSessionToken,
  extractUserSessionToken,
  userSessionCookieHeader,
  clearUserSessionCookieHeader,
  emailFingerprint,
} from "./user-session.js";
export {
  MemoryRateLimiter,
  adminMutationLimiter,
  publicApiLimiter,
  clientKey,
  type RateLimitResult,
} from "./rate-limit.js";
export {
  signupCustomer,
  loginCustomer,
  issueUserSessionToken,
  buildUserSessionCookieOptions,
  buildClearUserSessionCookieOptions,
  type CustomerAuthUser,
} from "./customer-auth.js";
export {
  sealSecret,
  openSecret,
  isTokenEncryptionConfigured,
} from "./seal-secrets.js";
