import type { OAuthProviderPort, TokenBundle } from "./types.js";
import { isTikTokConfigured, requireEnvFirst } from "./env.js";

/**
 * TikTok Login Kit + Content Posting API OAuth.
 * No passwords — authorization code + refresh_token grant only.
 */
export const tiktokProvider: OAuthProviderPort = {
  provider: "tiktok",

  isConfigured() {
    return isTikTokConfigured();
  },

  getAuthorizationUrl({ state, redirectUri }) {
    const clientKey = requireEnvFirst("TIKTOK_CLIENT_KEY", "TIKTOK_APP_ID");
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
    const clientKey = requireEnvFirst("TIKTOK_CLIENT_KEY", "TIKTOK_APP_ID");
    const clientSecret = requireEnvFirst(
      "TIKTOK_CLIENT_SECRET",
      "TIKTOK_APP_SECRET",
    );
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
    const clientKey = requireEnvFirst("TIKTOK_CLIENT_KEY", "TIKTOK_APP_ID");
    const clientSecret = requireEnvFirst(
      "TIKTOK_CLIENT_SECRET",
      "TIKTOK_APP_SECRET",
    );
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

  async publish(input) {
    // TikTok Content Posting API — PULL_FROM_URL when media is ready.
    // If media is missing or API rejects (review / scope), caller should
    // keep the generated caption/scripts and mark the post as awaiting publish.
    if (!input.mediaUrl) {
      const err = new Error(
        "TikTok publish requires mediaUrl (9:16 video). Assets generated — awaiting media/API.",
      ) as Error & { code?: string };
      err.code = "awaiting_assets";
      throw err;
    }

    const initRes = await fetch(
      "https://open.tiktokapis.com/v2/post/publish/video/init/",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${input.accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
        },
        body: JSON.stringify({
          post_info: {
            title: input.content.slice(0, 150),
            privacy_level: process.env.TIKTOK_PRIVACY_LEVEL?.trim() || "PUBLIC_TO_EVERYONE",
            disable_duet: false,
            disable_comment: false,
            disable_stitch: false,
          },
          source_info: {
            source: "PULL_FROM_URL",
            video_url: input.mediaUrl,
          },
        }),
      },
    );
    const json = (await initRes.json().catch(() => ({}))) as {
      data?: { publish_id?: string };
      error?: { code?: string; message?: string; log_id?: string };
    };
    if (!initRes.ok || !json.data?.publish_id) {
      const msg =
        json.error?.message ||
        json.error?.code ||
        `TikTok publish init failed (HTTP ${initRes.status})`;
      const err = new Error(msg) as Error & { code?: string };
      // Common while app is in audit / missing video.publish scope
      if (
        /scope|audit|not.?approved|forbidden|inbox_available|unaudited/i.test(msg) ||
        initRes.status === 403 ||
        initRes.status === 401
      ) {
        err.code = "awaiting_api_review";
      }
      throw err;
    }
    return { externalPostId: json.data.publish_id };
  },

  async queryPublishStatus({ accessToken, publishId }) {
    const res = await fetch(
      "https://open.tiktokapis.com/v2/post/publish/status/fetch/",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
        },
        body: JSON.stringify({ publish_id: publishId }),
      },
    );
    const json = (await res.json().catch(() => ({}))) as {
      data?: { status?: string; fail_reason?: string };
      error?: { message?: string };
    };
    if (!res.ok || !json.data?.status) return null;
    return {
      status: json.data.status,
      failReason: json.data.fail_reason,
    };
  },

  /**
   * Best-effort TikTok video analytics.
   * Returns null when API unavailable / scope missing — never fabricates.
   */
  async fetchVideoMetrics({ accessToken, externalPostId }) {
    // publish_id from init is not always a public video id; skip awaiting:* placeholders
    if (
      !externalPostId ||
      externalPostId.startsWith("awaiting:") ||
      externalPostId.startsWith("pending:")
    ) {
      return null;
    }

    const fields = [
      "like_count",
      "comment_count",
      "share_count",
      "view_count",
    ].join(",");

    // Try video query by id (Display API / Research — may require extra scopes)
    const url = new URL("https://open.tiktokapis.com/v2/video/query/");
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filters: { video_ids: [externalPostId] },
        fields: fields.split(","),
      }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      data?: {
        videos?: Array<{
          like_count?: number;
          comment_count?: number;
          share_count?: number;
          view_count?: number;
        }>;
      };
      error?: { code?: string; message?: string };
    };
    if (!res.ok) return null;
    const video = json.data?.videos?.[0];
    if (!video) return null;

    const plays = typeof video.view_count === "number" ? video.view_count : null;
    const likes = typeof video.like_count === "number" ? video.like_count : null;
    const comments =
      typeof video.comment_count === "number" ? video.comment_count : null;
    const shares =
      typeof video.share_count === "number" ? video.share_count : null;

    return {
      plays,
      likesCount: likes,
      commentsCount: comments,
      sharesCount: shares,
      // Rates / retention / profile / affiliate require Business API or site analytics
      avgWatchSec: null,
      watchRetentionRate: null,
      completionRate: null,
      hold3SecRate: null,
      likeRate: plays && likes != null ? likes / Math.max(plays, 1) : null,
      commentRate: plays && comments != null ? comments / Math.max(plays, 1) : null,
      shareRate: plays && shares != null ? shares / Math.max(plays, 1) : null,
      saveRate: null,
      savesCount: null,
      profileVisitRate: null,
      profileVisits: null,
      linkClickRate: null,
      affiliateClicks: null,
      conversions: null,
      revenue: null,
    };
  },
};
