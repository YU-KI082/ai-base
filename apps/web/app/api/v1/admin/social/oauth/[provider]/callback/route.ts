import { NextResponse } from "next/server";
import {
  completeOAuthCallback,
  isOAuthProvider,
  verifyOAuthState,
} from "@ai-base/sns-oauth";
import { isTokenEncryptionConfigured } from "@ai-base/auth";

function siteUrl(request: Request): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    new URL(request.url).origin
  );
}

/**
 * Official OAuth callback — exchanges code for tokens and encrypts them at rest.
 * Ops must have started the flow from /ops/social (state cookie).
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider: raw } = await context.params;
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");
  const adminSocial = new URL("/ops/social", siteUrl(request));

  if (!isOAuthProvider(raw)) {
    adminSocial.searchParams.set("oauth_error", "unknown_provider");
    return NextResponse.redirect(adminSocial);
  }
  if (oauthError) {
    adminSocial.searchParams.set("oauth_error", oauthError);
    return NextResponse.redirect(adminSocial);
  }
  if (!code || !state) {
    adminSocial.searchParams.set("oauth_error", "missing_code");
    return NextResponse.redirect(adminSocial);
  }
  if (!isTokenEncryptionConfigured()) {
    adminSocial.searchParams.set("oauth_error", "encryption_not_configured");
    return NextResponse.redirect(adminSocial);
  }

  try {
    const cookieState = request.headers
      .get("cookie")
      ?.split(";")
      .map((p) => p.trim())
      .find((p) => p.startsWith(`oauth_state_${raw}=`))
      ?.slice(`oauth_state_${raw}=`.length);
    if (!cookieState || cookieState !== state) {
      throw new Error("OAuth state mismatch");
    }
    const provider = verifyOAuthState(state);
    if (provider !== raw) throw new Error("Provider mismatch");
    await completeOAuthCallback({
      provider: raw,
      code,
      siteUrl: siteUrl(request),
    });
    adminSocial.searchParams.set("oauth", "connected");
    adminSocial.searchParams.set("provider", raw);
    const response = NextResponse.redirect(adminSocial);
    response.cookies.set(`oauth_state_${raw}`, "", { path: "/", maxAge: 0 });
    return response;
  } catch (error) {
    adminSocial.searchParams.set(
      "oauth_error",
      error instanceof Error ? error.message.slice(0, 120) : "callback_failed",
    );
    return NextResponse.redirect(adminSocial);
  }
}
