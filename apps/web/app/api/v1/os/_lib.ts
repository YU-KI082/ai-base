import { AuthError, requireUser } from "@ai-base/auth";
import { NextResponse } from "next/server";

export async function withOsUser(
  request: Request,
  handler: (ctx: Awaited<ReturnType<typeof requireUser>>) => Promise<Response>,
): Promise<Response> {
  try {
    const ctx = await requireUser(request);
    return await handler(ctx);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
