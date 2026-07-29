import { prisma } from "@ai-base/database";
import {
  isAdminDevBypassEnabled,
  isLocalDevRequest,
  isProductionRuntime,
} from "./env.js";
import {
  extractOpsCredential,
  isOpsAuthConfigured,
  verifyOpsSessionToken,
} from "./ops-session.js";
import { AuthError, type AuthUser } from "./types.js";

async function loadUserByEmail(email: string): Promise<AuthUser> {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      roles: {
        include: {
          role: {
            include: {
              permissions: { include: { permission: true } },
            },
          },
        },
      },
    },
  });
  if (!user) {
    throw new AuthError("Seeded admin user missing. Run db:seed.", 401);
  }
  const permissions = user.roles.flatMap((ur) =>
    ur.role.permissions.map((rp) => rp.permission.key),
  );
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    permissions: [...new Set(permissions)],
  };
}

async function tryOpsAuth(request?: Request): Promise<AuthUser | null> {
  if (!isOpsAuthConfigured()) return null;
  const credential = extractOpsCredential(request);
  const secret = process.env.ADMIN_OPS_SECRET?.trim();
  if (
    credential &&
    secret &&
    (credential === secret || verifyOpsSessionToken(credential))
  ) {
    return loadUserByEmail("admin@ai-base.local");
  }
  return null;
}

/**
 * Resolves the admin actor.
 *
 * Local/dev: `ADMIN_DEV_BYPASS=true` maps to seeded admin — NEVER in production.
 * Production MVP: `ADMIN_OPS_SECRET` via cookie `aibase_session` or Bearer token.
 */
export async function requireAdmin(request?: Request): Promise<AuthUser> {
  if (isAdminDevBypassEnabled()) {
    if (!isLocalDevRequest(request)) {
      throw new AuthError(
        "ADMIN_DEV_BYPASS only allowed for localhost requests",
        401,
      );
    }
    return loadUserByEmail("admin@ai-base.local");
  }

  const opsUser = await tryOpsAuth(request);
  if (opsUser) return opsUser;

  if (process.env.ADMIN_DEV_BYPASS === "true" && isProductionRuntime()) {
    throw new AuthError(
      "ADMIN_DEV_BYPASS is ignored in production. Set ADMIN_OPS_SECRET and sign in at /login.",
      401,
    );
  }

  if (!isOpsAuthConfigured()) {
    throw new AuthError(
      "Admin auth not configured. Set ADMIN_OPS_SECRET (8+ chars) for production.",
      401,
    );
  }

  throw new AuthError("Unauthorized", 401);
}

export async function tryRequireAdmin(
  request?: Request,
): Promise<AuthUser | null> {
  try {
    return await requireAdmin(request);
  } catch {
    return null;
  }
}
