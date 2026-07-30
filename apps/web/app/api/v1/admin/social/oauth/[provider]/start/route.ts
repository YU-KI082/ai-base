import { NextResponse } from "next/server";
import {
  AuthError,
  hasPermission,
  isTokenEncryptionConfigured,
  requireAdmin,
} from "@ai-base/auth";
import {
  createOAuthState,
  getProvider,
  isOAuthProvider,
  oauthRedirectUri,
  oauthSetupStatus,
} from "@ai-base/sns-oauth";

function siteUrl(request: Request): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    new URL(request.url).origin
  );
}

function adminSocialRedirect(
  request: Request,
  params: Record<string, string>,
): NextResponse {
  const url = new URL("/admin/social", siteUrl(request));
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return NextResponse.redirect(url);
}

/**
 * Browser OAuth entry — always redirects (Meta/TikTok/X login or admin error).
 * Never returns JSON for the Connect button navigation.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider: raw } = await context.params;
  const nextPath = `/api/v1/admin/social/oauth/${raw}/start`;

  try {
    const user = await requireAdmin(request);
    if (!hasPermission(user, "settings.manage")) {
      return adminSocialRedirect(request, {
        oauth_error: "forbidden",
      });
    }
  } catch (error) {
    if (error instanceof AuthError && error.status === 401) {
      const login = new URL("/login", siteUrl(request));
      login.searchParams.set("next", nextPath);
      return NextResponse.redirect(login);
    }
    return adminSocialRedirect(request, {
      oauth_error:
        error instanceof Error
          ? error.message.slice(0, 120)
          : "auth_failed",
    });
  }

  if (!isOAuthProvider(raw)) {
    return adminSocialRedirect(request, { oauth_error: "unknown_provider" });
  }

  if (!isTokenEncryptionConfigured()) {
    return adminSocialRedirect(request, {
      oauth_error: "TOKEN_ENCRYPTION_KEY is missing (32+ chars required)",
    });
  }

  const provider = getProvider(raw);
  if (!provider.isConfigured()) {
    const setup = oauthSetupStatus(siteUrl(request)).find(
      (s) => s.provider === raw,
    );
    const missing = setup?.missingEnv?.join(", ") || `${raw.toUpperCase()}_*`;
    return adminSocialRedirect(request, {
      oauth_error: `${raw} authentication is not configured or credentials are missing (${missing})`,
    });
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
    return adminSocialRedirect(request, {
      oauth_error:
        error instanceof Error
          ? error.message.slice(0, 160)
          : "oauth_start_failed",
    });
  }
}
