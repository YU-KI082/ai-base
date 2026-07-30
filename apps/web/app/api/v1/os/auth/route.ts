import { NextResponse } from "next/server";
import {
  AuthError,
  clearUserSessionCookieHeader,
  createUserSessionToken,
  hashPassword,
  userSessionCookieHeader,
  verifyPassword,
} from "@ai-base/auth";
import {
  CustomerUserRepository,
  WorkspaceRepository,
} from "@ai-base/database";
import { z } from "zod";

const customers = new CustomerUserRepository();
const workspaces = new WorkspaceRepository();

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(80).optional(),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
});

function secureCookie() {
  return (
    process.env.COOKIE_SECURE === "true" ||
    process.env.VERCEL === "1" ||
    process.env.VERCEL_ENV === "production"
  );
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action") || "login";

  if (action === "signup") {
    const body = await request.json().catch(() => null);
    const parsed = SignupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "メールと8文字以上のパスワードが必要です" },
        { status: 400 },
      );
    }
    const email = parsed.data.email.toLowerCase();
    const existing = await customers.findByEmail(email);
    if (existing) {
      return NextResponse.json(
        { error: "このメールは既に登録されています" },
        { status: 409 },
      );
    }
    const user = await customers.createCustomer({
      email,
      name: parsed.data.name,
      passwordHash: hashPassword(parsed.data.password),
      locale: "ja",
    });
    await workspaces.create({
      ownerUserId: user.id,
      name: parsed.data.name || email.split("@")[0] || "My brand",
    });
    const token = createUserSessionToken({ userId: user.id, email: user.email });
    const res = NextResponse.json({
      ok: true,
      user: { id: user.id, email: user.email, name: user.name },
    });
    res.cookies.set("aibase_user_session", token, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: secureCookie(),
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  }

  if (action === "logout") {
    const res = NextResponse.json({ ok: true });
    res.cookies.set("aibase_user_session", "", {
      path: "/",
      httpOnly: true,
      maxAge: 0,
    });
    return res;
  }

  // login
  const body = await request.json().catch(() => null);
  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "入力内容を確認してください" }, { status: 400 });
  }
  const user = await customers.findByEmail(parsed.data.email);
  if (!user?.passwordHash || user.kind !== "customer") {
    return NextResponse.json({ error: "メールまたはパスワードが違います" }, { status: 401 });
  }
  if (!verifyPassword(parsed.data.password, user.passwordHash)) {
    return NextResponse.json({ error: "メールまたはパスワードが違います" }, { status: 401 });
  }
  if (user.status !== "active") {
    return NextResponse.json({ error: "アカウントが無効です" }, { status: 403 });
  }
  const token = createUserSessionToken({ userId: user.id, email: user.email });
  const res = NextResponse.json({
    ok: true,
    user: { id: user.id, email: user.email, name: user.name },
  });
  res.cookies.set("aibase_user_session", token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookie(),
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

export async function GET(request: Request) {
  try {
    const { requireUser } = await import("@ai-base/auth");
    const ctx = await requireUser(request);
    return NextResponse.json({
      ok: true,
      user: ctx.user,
      workspaceId: ctx.workspaceId,
      setupDone: ctx.setupDone,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

// silence unused imports in some trees
void userSessionCookieHeader;
void clearUserSessionCookieHeader;
