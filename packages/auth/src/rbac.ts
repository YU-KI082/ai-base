import type { AuthUser } from "./types.js";

/**
 * Least-privilege check. Superuser must hold the concrete permission
 * (seeded admin role includes all keys) — `admin.access` alone does not
 * imply every other permission.
 */
export function hasPermission(user: AuthUser, permission: string): boolean {
  return user.permissions.includes(permission);
}

export function hasAnyPermission(
  user: AuthUser,
  permissions: string[],
): boolean {
  return permissions.some((p) => hasPermission(user, p));
}
