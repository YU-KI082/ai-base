import type { OAuthProviderPort, TokenBundle } from "./types.js";

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`${name} is not configured`);
  return v;
}

/**
 * TikTok Login Kit + Content Posting API OAuth.
 * No passwords — authorization code + refresh_token grant only.
 */
export const tiktokProvider: OAuthProviderPort = {
  provider: "tiktok",

  isConfigured() {
    return Boolean(
      process.env.TIKTOK_CLIENT_KEY?.trim() &&
        process.env.TIKTOK_CLIENT_SECRET?.trim(),
    );
  },

  getAuthorizationUrl({ state, redirectUri }) {
    const clientKey = requireEnv("TIKTOK_CLIENT_KEY");
    const scopes = (
      process.env.TIKTOK_OAUTH_SCOPES?.trim() ||
      "user.info.basic,video.upload,video.publish"
    )
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .join(",");
    const url = new URL("https://www.tiktok.com/v2/auth/authorize/");
    url.searchParams.set("client_key", clientKey);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", scopes);
    return url.toString();
  },

  async exchangeCode({ code, redirectUri }) {
    const clientKey = requireEnv("TIKTOK_CLIENT_KEY");
    const clientSecret = requireEnv("TIKTOK_CLIENT_SECRET");
    const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });
    const json = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      refresh_expires_in?: number;
      open_id?: string;
      scope?: string;
      error?: string;
      error_description?: string;
    };
    if (!res.ok || !json.access_token || !json.refresh_token) {
      throw new Error(
        json.error_description || json.error || "TikTok token exchange failed",
      );
    }
    const expiresIn = Number(json.expires_in ?? 86400);
    const refreshExpires = Number(json.refresh_expires_in ?? 365 * 86400);
    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token,
      accessTokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
      refreshTokenExpiresAt: new Date(Date.now() + refreshExpires * 1000),
      externalAccountId: json.open_id ?? null,
      accountLabel: "TikTok",
      scopes: (json.scope ?? "").split(",").filter(Boolean),
      metadata: { openId: json.open_id },
    } satisfies TokenBundle;
  },

  async refresh({ refreshToken }) {
    if (!refreshToken) throw new Error("Missing TikTok refresh token");
    const clientKey = requireEnv("TIKTOK_CLIENT_KEY");
    const clientSecret = requireEnv("TIKTOK_CLIENT_SECRET");
    const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });
    const json = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      refresh_expires_in?: number;
      error?: string;
      error_description?: string;
    };
    if (!res.ok || !json.access_token) {
      const msg =
        json.error_description || json.error || "TikTok token refresh failed";
      const err = new Error(msg) as Error & { code?: string };
      if (/invalid|expired|revoked|authorize/i.test(msg)) {
        err.code = "reauth_required";
      }
      throw err;
    }
    const expiresIn = Number(json.expires_in ?? 86400);
    const refreshExpires = Number(json.refresh_expires_in ?? 365 * 86400);
    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token ?? refreshToken,
      accessTokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
      refreshTokenExpiresAt: new Date(Date.now() + refreshExpires * 1000),
    };
  },

  async validate(accessToken) {
    const res = await fetch(
      "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    if (res.ok) return { ok: true };
    const json = (await res.json().catch(() => ({}))) as {
      error?: { message?: string; code?: string };
    };
    return {
      ok: false,
      reason: json.error?.message ?? `HTTP ${res.status}`,
    };
  },
};
