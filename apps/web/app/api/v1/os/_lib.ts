import { AuthError, requireUser } from "@ai-base/auth";
import { OsAiUnavailableError } from "@ai-base/marketing-os";
import { NextResponse } from "next/server";

function jaError(error: unknown): string {
  if (error instanceof OsAiUnavailableError) {
    return error.message;
  }
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
    if (/LLM|API key|not configured|AI_UNAVAILABLE|準備中/i.test(m)) {
      return "AI機能は準備中です。接続設定が完了すると利用できます。";
    }
    if (/Transactions are not supported/i.test(m)) {
      return "一時的なサーバーエラーです。時間をおいて再度お試しください。";
    }
    if (/Argument `.+` is missing|Task item title is required/i.test(m)) {
      return "AIの応答形式が不正でした。もう一度お試しください。";
    }
    if (/Failed to deserialize|Neon|prisma/i.test(m)) {
      return "データの保存に失敗しました。時間をおいて再度お試しください。";
    }
    if (/^[A-Za-z0-9_:[\]\s."'`-]+$/.test(m) && /error|Error|fail|Fail|Exception/.test(m)) {
      return "予期しないエラーが発生しました。時間をおいて再度お試しください。";
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
    const status =
      error instanceof OsAiUnavailableError
        ? 503
        : error instanceof AuthError
          ? error.status
          : 500;
    return NextResponse.json(
      {
        error: jaError(error),
        code: error instanceof OsAiUnavailableError ? "AI_UNAVAILABLE" : undefined,
        pending: error instanceof OsAiUnavailableError ? true : undefined,
      },
      { status },
    );
  }
}
