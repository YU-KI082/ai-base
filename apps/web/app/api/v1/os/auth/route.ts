import { NextResponse } from "next/server";
import {
  AuthError,
  signupCustomer,
  loginCustomer,
  issueUserSessionToken,
  buildUserSessionCookieOptions,
  buildClearUserSessionCookieOptions,
  requireUser,
} from "@ai-base/auth";
import { z } from "zod";

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(80).optional(),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
});

function sessionResponse(user: { id: string; email: string; name: string | null }) {
  const token = issueUserSessionToken(user);
  const cookie = buildUserSessionCookieOptions(token);
  const res = NextResponse.json({
    ok: true,
    user: { id: user.id, email: user.email, name: user.name },
  });
  res.cookies.set(cookie.name, cookie.value, {
    path: cookie.path,
    httpOnly: cookie.httpOnly,
    sameSite: cookie.sameSite,
    secure: cookie.secure,
    maxAge: cookie.maxAge,
  });
  return res;
}

function jaAuthError(error: unknown): string {
  if (error instanceof AuthError) return error.message;
  if (error instanceof Error) {
    if (/Transactions are not supported/i.test(error.message)) {
      return "サーバー設定の不整合が発生しました。時間をおいて再度お試しください。";
    }
    return error.message.length > 160
      ? `${error.message.slice(0, 160)}…`
      : error.message;
  }
  return "登録処理に失敗しました。時間をおいて再度お試しください。";
}

export async function POST(request: Request) {
  try {
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
      const user = await signupCustomer(parsed.data);
      return sessionResponse(user);
    }

    if (action === "logout") {
      const clear = buildClearUserSessionCookieOptions();
      const res = NextResponse.json({ ok: true });
      res.cookies.set(clear.name, clear.value, {
        path: clear.path,
        httpOnly: clear.httpOnly,
        sameSite: clear.sameSite,
        secure: clear.secure,
        maxAge: clear.maxAge,
      });
      return res;
    }

    const body = await request.json().catch(() => null);
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "入力内容を確認してください" }, { status: 400 });
    }
    const user = await loginCustomer(parsed.data);
    return sessionResponse(user);
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 500;
    return NextResponse.json({ error: jaAuthError(error) }, { status });
  }
}

export async function GET(request: Request) {
  try {
    const ctx = await requireUser(request);
    return NextResponse.json({
      ok: true,
      user: ctx.user,
      workspaceId: ctx.workspaceId,
      setupDone: ctx.setupDone,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        {
          error:
            error.status === 401
              ? "ログインが必要です。もう一度ログインしてください。"
              : error.message,
        },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { error: "ログインが必要です。もう一度ログインしてください。" },
      { status: 401 },
    );
  }
}
