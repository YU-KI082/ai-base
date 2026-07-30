import {
  CustomerUserRepository,
  WorkspaceRepository,
} from "@ai-base/database";
import { AuthError } from "./types.js";
import { hashPassword, verifyPassword, createUserSessionToken } from "./user-session.js";
import { USER_SESSION_COOKIE } from "./constants.js";

const customers = new CustomerUserRepository();
const workspaces = new WorkspaceRepository();

export type CustomerAuthUser = {
  id: string;
  email: string;
  name: string | null;
};

function secureCookie() {
  return (
    process.env.COOKIE_SECURE === "true" ||
    process.env.VERCEL === "1" ||
    process.env.VERCEL_ENV === "production"
  );
}

export function buildUserSessionCookieOptions(token: string) {
  return {
    name: USER_SESSION_COOKIE,
    value: token,
    path: "/" as const,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: secureCookie(),
    maxAge: 60 * 60 * 24 * 30,
  };
}

export function buildClearUserSessionCookieOptions() {
  return {
    name: USER_SESSION_COOKIE,
    value: "",
    path: "/" as const,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: secureCookie(),
    maxAge: 0,
  };
}

export async function signupCustomer(input: {
  email: string;
  password: string;
  name?: string;
}): Promise<CustomerAuthUser> {
  const email = input.email.toLowerCase().trim();
  const existing = await customers.findByEmail(email);
  if (existing) {
    // Recover orphaned accounts from earlier Neon HTTP create failures.
    const ws = await workspaces.findByOwner(existing.id);
    if (
      !ws &&
      existing.kind === "customer" &&
      existing.passwordHash &&
      verifyPassword(input.password, existing.passwordHash)
    ) {
      await workspaces.create({
        ownerUserId: existing.id,
        name: input.name || existing.name || email.split("@")[0] || "My brand",
      });
      return { id: existing.id, email: existing.email, name: existing.name };
    }
    throw new AuthError("このメールは既に登録されています", 409);
  }

  const user = await customers.createCustomer({
    email,
    name: input.name,
    passwordHash: hashPassword(input.password),
    locale: "ja",
  });
  await workspaces.create({
    ownerUserId: user.id,
    name: input.name || email.split("@")[0] || "My brand",
  });
  return { id: user.id, email: user.email, name: user.name };
}

export async function loginCustomer(input: {
  email: string;
  password: string;
}): Promise<CustomerAuthUser> {
  const user = await customers.findByEmail(input.email.toLowerCase().trim());
  if (!user?.passwordHash || user.kind !== "customer") {
    throw new AuthError("メールまたはパスワードが違います", 401);
  }
  if (!verifyPassword(input.password, user.passwordHash)) {
    throw new AuthError("メールまたはパスワードが違います", 401);
  }
  if (user.status !== "active") {
    throw new AuthError("アカウントが無効です", 403);
  }
  const ws = await workspaces.findByOwner(user.id);
  if (!ws) {
    await workspaces.create({
      ownerUserId: user.id,
      name: user.name || user.email.split("@")[0] || "My brand",
    });
  }
  return { id: user.id, email: user.email, name: user.name };
}

export function issueUserSessionToken(user: CustomerAuthUser): string {
  return createUserSessionToken({ userId: user.id, email: user.email });
}
