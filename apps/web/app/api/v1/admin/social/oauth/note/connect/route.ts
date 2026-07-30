import { NextResponse } from "next/server";
import {
  AuthError,
  hasPermission,
  requireAdmin,
} from "@ai-base/auth";
import { connectNoteDraftQueue } from "@ai-base/sns-oauth";

function siteUrl(request: Request): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    new URL(request.url).origin
  );
}

/**
 * One-click enable note draft-queue (no OAuth / no passwords).
 * GET for Connect button navigation — always redirects.
 */
export async function GET(request: Request) {
  const nextPath = "/api/v1/admin/social/oauth/note/connect";
  try {
    const user = await requireAdmin(request);
    if (!hasPermission(user, "settings.manage")) {
      const url = new URL("/ops/social", siteUrl(request));
      url.searchParams.set("oauth_error", "forbidden");
      return NextResponse.redirect(url);
    }
    await connectNoteDraftQueue();
    const url = new URL("/ops/social", siteUrl(request));
    url.searchParams.set("oauth", "connected");
    url.searchParams.set("provider", "note");
    return NextResponse.redirect(url);
  } catch (error) {
    if (error instanceof AuthError && error.status === 401) {
      const login = new URL("/ops/login", siteUrl(request));
      login.searchParams.set("next", nextPath);
      return NextResponse.redirect(login);
    }
    const url = new URL("/ops/social", siteUrl(request));
    url.searchParams.set(
      "oauth_error",
      error instanceof Error ? error.message.slice(0, 120) : "note_connect_failed",
    );
    return NextResponse.redirect(url);
  }
}
