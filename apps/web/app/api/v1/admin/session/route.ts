import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  createOpsSessionToken,
  isOpsAuthConfigured,
} from "@ai-base/auth";

export async function POST(request: Request) {
  if (!isOpsAuthConfigured()) {
    return NextResponse.json(
      { error: "ADMIN_OPS_SECRET is not configured" },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as { secret?: string };
  const secret = body.secret?.trim() ?? "";
  const expected = process.env.ADMIN_OPS_SECRET?.trim() ?? "";
  if (!secret || secret !== expected) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = createOpsSessionToken();
  if (!token) {
    return NextResponse.json({ error: "Session create failed" }, { status: 500 });
  }

  const response = NextResponse.json({ ok: true });
  const secure =
    process.env.COOKIE_SECURE === "true" ||
    process.env.VERCEL === "1" ||
    process.env.VERCEL_ENV === "production";
  response.cookies.set(SESSION_COOKIE, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure,
    maxAge: 60 * 60 * 24 * 14,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", {
    path: "/",
    httpOnly: true,
    maxAge: 0,
  });
  return response;
}
