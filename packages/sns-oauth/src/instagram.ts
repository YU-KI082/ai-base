import type { OAuthProviderPort, TokenBundle } from "./types.js";
import { isInstagramConfigured, requireEnvFirst } from "./env.js";

/**
 * Instagram via Meta Instagram Graph / Instagram Login (OAuth).
 * No passwords — authorization code + long-lived token refresh only.
 */
export const instagramProvider: OAuthProviderPort = {
  provider: "instagram",

  isConfigured() {
    return isInstagramConfigured();
  },

  getAuthorizationUrl({ state, redirectUri }) {
    const clientId = requireEnvFirst(
      "INSTAGRAM_APP_ID",
      "META_APP_ID",
      "FACEBOOK_APP_ID",
    );
    const scopes = (
      process.env.INSTAGRAM_OAUTH_SCOPES?.trim() ||
      "instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement,business_management"
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
    const clientId = requireEnvFirst(
      "INSTAGRAM_APP_ID",
      "META_APP_ID",
      "FACEBOOK_APP_ID",
    );
    const clientSecret = requireEnvFirst(
      "INSTAGRAM_APP_SECRET",
      "META_APP_SECRET",
      "FACEBOOK_APP_SECRET",
    );

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
    const clientId = requireEnvFirst(
      "INSTAGRAM_APP_ID",
      "META_APP_ID",
      "FACEBOOK_APP_ID",
    );
    const clientSecret = requireEnvFirst(
      "INSTAGRAM_APP_SECRET",
      "META_APP_SECRET",
      "FACEBOOK_APP_SECRET",
    );
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

  /**
   * Instagram Reels / video publish via Content Publishing API.
   * Requires mediaUrl (public HTTPS). Containers need IG user id in metadata.
   */
  async publish(input) {
    if (!input.mediaUrl) {
      const err = new Error(
        "Instagram publish requires mediaUrl (9:16 video)",
      ) as Error & { code?: string };
      err.code = "awaiting_assets";
      throw err;
    }

    const igUserId =
      process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID?.trim() ||
      process.env.INSTAGRAM_USER_ID?.trim();
    if (!igUserId) {
      const err = new Error(
        "INSTAGRAM_BUSINESS_ACCOUNT_ID required for Content Publishing API",
      ) as Error & { code?: string };
      err.code = "awaiting_api_review";
      throw err;
    }

    const caption = input.content.slice(0, 2200);
    const createUrl = new URL(`https://graph.facebook.com/v21.0/${igUserId}/media`);
    createUrl.searchParams.set("media_type", "REELS");
    createUrl.searchParams.set("video_url", input.mediaUrl);
    createUrl.searchParams.set("caption", caption);
    createUrl.searchParams.set("access_token", input.accessToken);

    const createRes = await fetch(createUrl, { method: "POST" });
    const created = (await createRes.json()) as {
      id?: string;
      error?: { message?: string; code?: number };
    };
    if (!createRes.ok || !created.id) {
      const msg =
        created.error?.message ||
        `Instagram media container failed HTTP ${createRes.status}`;
      const err = new Error(msg) as Error & { code?: string };
      if (/permission|oauth|session/i.test(msg) || createRes.status === 401) {
        err.code = "reauth_required";
      } else if (/not.*(approved|available)|unpublished/i.test(msg)) {
        err.code = "awaiting_api_review";
      }
      throw err;
    }

    for (let i = 0; i < 8; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const stRes = await fetch(
        `https://graph.facebook.com/v21.0/${created.id}?fields=status_code&access_token=${encodeURIComponent(input.accessToken)}`,
      );
      const st = (await stRes.json()) as { status_code?: string };
      if (st.status_code === "FINISHED") break;
      if (st.status_code === "ERROR") {
        throw new Error("Instagram media processing ERROR");
      }
    }

    const pubUrl = new URL(`https://graph.facebook.com/v21.0/${igUserId}/media_publish`);
    pubUrl.searchParams.set("creation_id", created.id);
    pubUrl.searchParams.set("access_token", input.accessToken);
    const pubRes = await fetch(pubUrl, { method: "POST" });
    const published = (await pubRes.json()) as {
      id?: string;
      error?: { message?: string };
    };
    if (!pubRes.ok || !published.id) {
      throw new Error(
        published.error?.message ||
          `Instagram publish failed HTTP ${pubRes.status}`,
      );
    }
    return { externalPostId: published.id };
  },
};
