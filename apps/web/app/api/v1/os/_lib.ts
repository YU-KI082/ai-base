import { AuthError, requireUser } from "@ai-base/auth";
import { NextResponse } from "next/server";

function jaError(error: unknown): string {
  if (error instanceof AuthError) {
    if (error.status === 401) return "ログインが必要です。もう一度ログインしてください。";
    if (error.status === 403) return "この操作を行う権限がありません。";
    return error.message;
  }
  if (error instanceof Error) {
    const m = error.message;
    if (/Unique constraint|already exists/i.test(m)) {
      return "すでに登録されているデータです。";
    }
    if (/TOKEN_ENCRYPTION|OAUTH_STATE/i.test(m)) {
      return "サーバー設定が不足しています。管理者にお問い合わせください。";
    }
    if (/LLM|API key|not configured/i.test(m)) {
      return "AIの設定が未完了です。しばらくしてから再度お試しください。";
    }
    return m.length > 180 ? `${m.slice(0, 180)}…` : m;
  }
  return "予期しないエラーが発生しました。時間をおいて再度お試しください。";
}

export async function withOsUser(
  request: Request,
  handler: (ctx: Awaited<ReturnType<typeof requireUser>>) => Promise<Response>,
): Promise<Response> {
  try {
    const ctx = await requireUser(request);
    return await handler(ctx);
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 500;
    return NextResponse.json({ error: jaError(error) }, { status });
  }
}
