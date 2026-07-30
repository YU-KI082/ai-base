import type { OAuthProviderPort, TokenBundle } from "./types.js";
import {
  instagramAppId,
  instagramAppSecret,
  isThreadsConfigured,
  requireEnvFirst,
} from "./env.js";

/**
 * Threads API (Meta) — OAuth + text publish.
 * No passwords. Uses Threads Graph endpoints when app is approved.
 */
export const threadsProvider: OAuthProviderPort = {
  provider: "threads",

  isConfigured() {
    return isThreadsConfigured();
  },

  getAuthorizationUrl({ state, redirectUri }) {
    const clientId =
      process.env.THREADS_APP_ID?.trim() ||
      instagramAppId() ||
      requireEnvFirst("INSTAGRAM_APP_ID", "META_APP_ID", "FACEBOOK_APP_ID");
    const scopes =
      process.env.THREADS_OAUTH_SCOPES?.trim() ||
      "threads_basic,threads_content_publish";
    const url = new URL("https://threads.net/oauth/authorize");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("scope", scopes);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("state", state);
    return url.toString();
  },

  async exchangeCode({ code, redirectUri }) {
    const clientId =
      process.env.THREADS_APP_ID?.trim() ||
      instagramAppId() ||
      requireEnvFirst("INSTAGRAM_APP_ID", "META_APP_ID", "FACEBOOK_APP_ID");
    const clientSecret =
      process.env.THREADS_APP_SECRET?.trim() ||
      instagramAppSecret() ||
      requireEnvFirst(
        "INSTAGRAM_APP_SECRET",
        "META_APP_SECRET",
        "FACEBOOK_APP_SECRET",
      );
    const res = await fetch("https://graph.threads.net/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code,
      }),
    });
    const json = (await res.json()) as {
      access_token?: string;
      user_id?: number | string;
      error_message?: string;
    };
    if (!res.ok || !json.access_token) {
      throw new Error(json.error_message || "Threads token exchange failed");
    }
    // Exchange for long-lived when available
    let accessToken = json.access_token;
    let expiresIn = 60 * 24 * 3600;
    try {
      const longUrl = new URL("https://graph.threads.net/access_token");
      longUrl.searchParams.set("grant_type", "th_exchange_token");
      longUrl.searchParams.set("client_secret", clientSecret);
      longUrl.searchParams.set("access_token", accessToken);
      const longRes = await fetch(longUrl);
      const longJson = (await longRes.json()) as {
        access_token?: string;
        expires_in?: number;
      };
      if (longRes.ok && longJson.access_token) {
        accessToken = longJson.access_token;
        expiresIn = Number(longJson.expires_in ?? expiresIn);
      }
    } catch {
      /* keep short-lived */
    }
    return {
      accessToken,
      refreshToken: accessToken,
      accessTokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
      externalAccountId: json.user_id != null ? String(json.user_id) : null,
      accountLabel: "Threads",
      scopes: (
        process.env.THREADS_OAUTH_SCOPES?.trim() || "threads_basic,threads_content_publish"
      ).split(","),
    } satisfies TokenBundle;
  },

  async refresh({ refreshToken, accessToken }) {
    const token = refreshToken || accessToken;
    if (!token) throw new Error("Missing Threads token");
    const clientSecret =
      process.env.THREADS_APP_SECRET?.trim() ||
      instagramAppSecret() ||
      requireEnvFirst(
        "INSTAGRAM_APP_SECRET",
        "META_APP_SECRET",
        "FACEBOOK_APP_SECRET",
      );
    const url = new URL("https://graph.threads.net/refresh_access_token");
    url.searchParams.set("grant_type", "th_refresh_token");
    url.searchParams.set("access_token", token);
    // some apps need client_secret; ignore if rejected
    void clientSecret;
    const res = await fetch(url);
    const json = (await res.json()) as {
      access_token?: string;
      expires_in?: number;
      error?: { message?: string };
    };
    if (!res.ok || !json.access_token) {
      const msg = json.error?.message || "Threads refresh failed";
      const err = new Error(msg) as Error & { code?: string };
      err.code = "reauth_required";
      throw err;
    }
    return {
      accessToken: json.access_token,
      refreshToken: json.access_token,
      accessTokenExpiresAt: new Date(
        Date.now() + Number(json.expires_in ?? 60 * 24 * 3600) * 1000,
      ),
    };
  },

  async validate(accessToken) {
    const res = await fetch(
      `https://graph.threads.net/v1.0/me?access_token=${encodeURIComponent(accessToken)}`,
    );
    if (res.ok) return { ok: true };
    return { ok: false, reason: `HTTP ${res.status}` };
  },

  async publish({ accessToken, content }) {
    // Resolve user id
    const meRes = await fetch(
      `https://graph.threads.net/v1.0/me?fields=id&access_token=${encodeURIComponent(accessToken)}`,
    );
    const me = (await meRes.json()) as { id?: string; error?: { message?: string } };
    if (!meRes.ok || !me.id) {
      throw new Error(me.error?.message || "Threads user id unavailable");
    }
    const text = content.slice(0, 500);
    const createRes = await fetch(
      `https://graph.threads.net/v1.0/${me.id}/threads`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          media_type: "TEXT",
          text,
          access_token: accessToken,
        }),
      },
    );
    const created = (await createRes.json()) as {
      id?: string;
      error?: { message?: string };
    };
    if (!createRes.ok || !created.id) {
      const err = new Error(
        created.error?.message || `Threads create failed HTTP ${createRes.status}`,
      ) as Error & { code?: string };
      if (createRes.status === 401) err.code = "reauth_required";
      throw err;
    }
    const pubRes = await fetch(
      `https://graph.threads.net/v1.0/${me.id}/threads_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          creation_id: created.id,
          access_token: accessToken,
        }),
      },
    );
    const published = (await pubRes.json()) as {
      id?: string;
      error?: { message?: string };
    };
    if (!pubRes.ok || !published.id) {
      throw new Error(
        published.error?.message || `Threads publish failed HTTP ${pubRes.status}`,
      );
    }
    return { externalPostId: published.id };
  },
};
