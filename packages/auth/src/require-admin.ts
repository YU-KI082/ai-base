import { prisma } from "@ai-base/database";
import {
  isAdminDevBypassEnabled,
  isLocalDevRequest,
  isProductionRuntime,
} from "./env.js";
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

/**
 * Resolves the admin actor.
 *
 * Local/dev: `ADMIN_DEV_BYPASS=true` maps to seeded admin — NEVER in production.
 * Production: Bearer JWT via Supabase (port reserved; fails closed until configured).
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

  if (
    process.env.ADMIN_DEV_BYPASS === "true" &&
    isProductionRuntime()
  ) {
    throw new AuthError(
      "ADMIN_DEV_BYPASS is ignored in production. Configure Supabase auth.",
      401,
    );
  }

  const authHeader = request?.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AuthError("Unauthorized", 401);
  }

  // Placeholder for Supabase JWT verification — keep port stable; fail closed.
  throw new AuthError(
    "Supabase auth not configured. Use ADMIN_DEV_BYPASS=true only in non-production.",
    401,
  );
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
