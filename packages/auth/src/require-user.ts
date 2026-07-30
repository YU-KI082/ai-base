import {
  CustomerUserRepository,
  WorkspaceRepository,
} from "@ai-base/database";
import { AuthError, type AuthUser } from "./types.js";
import {
  extractUserSessionToken,
  verifyUserSessionToken,
} from "./user-session.js";

export type OsUserContext = {
  user: AuthUser;
  workspaceId: string;
  setupDone: boolean;
};

const customers = new CustomerUserRepository();
const workspaces = new WorkspaceRepository();

export async function requireUser(request: Request): Promise<OsUserContext> {
  const token = extractUserSessionToken(request);
  const payload = verifyUserSessionToken(token);
  if (!payload) {
    throw new AuthError("Unauthorized", 401);
  }
  const row = await customers.findById(payload.userId);
  if (!row || row.status !== "active") {
    throw new AuthError("Unauthorized", 401);
  }
  if (row.kind !== "customer") {
    throw new AuthError("Customer account required", 403);
  }
  let workspace = await workspaces.findByOwner(row.id);
  if (!workspace) {
    workspace = await workspaces.create({
      ownerUserId: row.id,
      name: row.name || row.email.split("@")[0] || "My brand",
    });
  }
  return {
    user: {
      id: row.id,
      email: row.email,
      name: row.name,
      permissions: ["os.use"],
    },
    workspaceId: workspace.id,
    setupDone: workspace.setupDone,
  };
}

export async function tryRequireUser(
  request: Request,
): Promise<OsUserContext | null> {
  try {
    return await requireUser(request);
  } catch (error) {
    if (error instanceof AuthError && error.status === 401) return null;
    throw error;
  }
}
