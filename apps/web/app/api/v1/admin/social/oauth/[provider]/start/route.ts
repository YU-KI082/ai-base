import { NextResponse } from "next/server";
import { withAdmin } from "@/app/api/v1/_lib/admin";
import { jsonError, jsonOk } from "@/app/api/v1/_lib/http";
import {
  createOAuthState,
  getProvider,
  isOAuthProvider,
  oauthRedirectUri,
} from "@ai-base/sns-oauth";

function siteUrl(request: Request): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    new URL(request.url).origin
  );
}

export async function GET(
  request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  return withAdmin(request, "settings.manage", async () => {
    const { provider: raw } = await context.params;
    if (!isOAuthProvider(raw)) {
      return jsonError("Unknown provider", 400);
    }
    const provider = getProvider(raw);
    if (!provider.isConfigured()) {
      return jsonError(
        `${raw} のアプリ認証情報が未設定です（INSTAGRAM_* / TIKTOK_*）`,
        503,
      );
    }
    try {
      const state = createOAuthState(raw);
      const redirectUri = oauthRedirectUri(raw, siteUrl(request));
      const url = provider.getAuthorizationUrl({ state, redirectUri });
      const response = NextResponse.redirect(url);
      response.cookies.set(`oauth_state_${raw}`, state, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 15 * 60,
        secure: process.env.VERCEL === "1",
      });
      return response;
    } catch (error) {
      return jsonError(
        error instanceof Error ? error.message : String(error),
        500,
      );
    }
  });
}
