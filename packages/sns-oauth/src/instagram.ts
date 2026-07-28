import type { OAuthProviderPort, TokenBundle } from "./types.js";

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`${name} is not configured`);
  return v;
}

/**
 * Instagram via Meta Instagram Graph / Instagram Login (OAuth).
 * No passwords — authorization code + long-lived token refresh only.
 */
export const instagramProvider: OAuthProviderPort = {
  provider: "instagram",

  isConfigured() {
    return Boolean(
      process.env.INSTAGRAM_APP_ID?.trim() &&
        process.env.INSTAGRAM_APP_SECRET?.trim(),
    );
  },

  getAuthorizationUrl({ state, redirectUri }) {
    const clientId = requireEnv("INSTAGRAM_APP_ID");
    const scopes = (
      process.env.INSTAGRAM_OAUTH_SCOPES?.trim() ||
      "instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement"
    )
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .join(",");
    const url = new URL("https://www.facebook.com/v21.0/dialog/oauth");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", scopes);
    return url.toString();
  },

  async exchangeCode({ code, redirectUri }) {
    const clientId = requireEnv("INSTAGRAM_APP_ID");
    const clientSecret = requireEnv("INSTAGRAM_APP_SECRET");

    const shortUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
    shortUrl.searchParams.set("client_id", clientId);
    shortUrl.searchParams.set("client_secret", clientSecret);
    shortUrl.searchParams.set("redirect_uri", redirectUri);
    shortUrl.searchParams.set("code", code);
    const shortRes = await fetch(shortUrl);
    const shortJson = (await shortRes.json()) as {
      access_token?: string;
      error?: { message?: string };
    };
    if (!shortRes.ok || !shortJson.access_token) {
      throw new Error(
        shortJson.error?.message ?? "Instagram short-lived token exchange failed",
      );
    }

    const longUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
    longUrl.searchParams.set("grant_type", "fb_exchange_token");
    longUrl.searchParams.set("client_id", clientId);
    longUrl.searchParams.set("client_secret", clientSecret);
    longUrl.searchParams.set("fb_exchange_token", shortJson.access_token);
    const longRes = await fetch(longUrl);
    const longJson = (await longRes.json()) as {
      access_token?: string;
      expires_in?: number;
      error?: { message?: string };
    };
    if (!longRes.ok || !longJson.access_token) {
      throw new Error(
        longJson.error?.message ?? "Instagram long-lived token exchange failed",
      );
    }

    const meRes = await fetch(
      `https://graph.facebook.com/v21.0/me?fields=id,name&access_token=${encodeURIComponent(longJson.access_token)}`,
    );
    const me = (await meRes.json()) as { id?: string; name?: string };

    const expiresIn = Number(longJson.expires_in ?? 60 * 24 * 3600);
    return {
      accessToken: longJson.access_token,
      refreshToken: longJson.access_token,
      accessTokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
      externalAccountId: me.id ?? null,
      accountLabel: me.name ?? "Instagram",
      scopes: (
        process.env.INSTAGRAM_OAUTH_SCOPES?.trim() ||
        "instagram_basic,instagram_content_publish"
      ).split(","),
      metadata: { tokenType: "long_lived" },
    } satisfies TokenBundle;
  },

  async refresh({ refreshToken, accessToken }) {
    const clientId = requireEnv("INSTAGRAM_APP_ID");
    const clientSecret = requireEnv("INSTAGRAM_APP_SECRET");
    const token = refreshToken || accessToken;
    if (!token) throw new Error("Missing Instagram token for refresh");

    const url = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
    url.searchParams.set("grant_type", "fb_exchange_token");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("client_secret", clientSecret);
    url.searchParams.set("fb_exchange_token", token);
    const res = await fetch(url);
    const json = (await res.json()) as {
      access_token?: string;
      expires_in?: number;
      error?: { message?: string; code?: number };
    };
    if (!res.ok || !json.access_token) {
      const msg = json.error?.message ?? "Instagram token refresh failed";
      const err = new Error(msg) as Error & { code?: string };
      if (
        /session|expired|invalid|revoked|OAuthException/i.test(msg) ||
        json.error?.code === 190
      ) {
        err.code = "reauth_required";
      }
      throw err;
    }
    const expiresIn = Number(json.expires_in ?? 60 * 24 * 3600);
    return {
      accessToken: json.access_token,
      refreshToken: json.access_token,
      accessTokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
    };
  },

  async validate(accessToken) {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/me?access_token=${encodeURIComponent(accessToken)}`,
    );
    if (res.ok) return { ok: true };
    const json = (await res.json().catch(() => ({}))) as {
      error?: { message?: string; code?: number };
    };
    return {
      ok: false,
      reason: json.error?.message ?? `HTTP ${res.status}`,
    };
  },
};
