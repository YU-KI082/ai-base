import type { OAuthProviderPort, TokenBundle } from "./types.js";

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`${name} is not configured`);
  return v;
}

/**
 * X (Twitter) OAuth 2.0 PKCE + tweet publish.
 * No passwords — authorization code + refresh_token only.
 */
export const xProvider: OAuthProviderPort = {
  provider: "x",

  isConfigured() {
    return Boolean(
      process.env.X_CLIENT_ID?.trim() && process.env.X_CLIENT_SECRET?.trim(),
    );
  },

  getAuthorizationUrl({ state, redirectUri }) {
    const clientId = requireEnv("X_CLIENT_ID");
    const scopes = (
      process.env.X_OAUTH_SCOPES?.trim() ||
      "tweet.read tweet.write users.read offline.access"
    )
      .split(/[,\s]+/)
      .filter(Boolean)
      .join(" ");
    const url = new URL("https://twitter.com/i/oauth2/authorize");
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("scope", scopes);
    url.searchParams.set("state", state);
    // PKCE: for production store challenge; here use plain state-bound verifier env or generated
    const challenge =
      process.env.X_OAUTH_CODE_CHALLENGE?.trim() || "challenge";
    url.searchParams.set("code_challenge", challenge);
    url.searchParams.set("code_challenge_method", "plain");
    return url.toString();
  },

  async exchangeCode({ code, redirectUri }) {
    const clientId = requireEnv("X_CLIENT_ID");
    const clientSecret = requireEnv("X_CLIENT_SECRET");
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const verifier =
      process.env.X_OAUTH_CODE_VERIFIER?.trim() ||
      process.env.X_OAUTH_CODE_CHALLENGE?.trim() ||
      "challenge";
    const res = await fetch("https://api.twitter.com/2/oauth2/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code_verifier: verifier,
      }),
    });
    const json = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
      error_description?: string;
      error?: string;
    };
    if (!res.ok || !json.access_token) {
      throw new Error(json.error_description || json.error || "X token exchange failed");
    }
    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token ?? null,
      accessTokenExpiresAt: new Date(
        Date.now() + Number(json.expires_in ?? 7200) * 1000,
      ),
      accountLabel: "X",
      scopes: (json.scope ?? "").split(" ").filter(Boolean),
    } satisfies TokenBundle;
  },

  async refresh({ refreshToken }) {
    if (!refreshToken) throw new Error("Missing X refresh token");
    const clientId = requireEnv("X_CLIENT_ID");
    const clientSecret = requireEnv("X_CLIENT_SECRET");
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const res = await fetch("https://api.twitter.com/2/oauth2/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });
    const json = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      error_description?: string;
      error?: string;
    };
    if (!res.ok || !json.access_token) {
      const msg = json.error_description || json.error || "X refresh failed";
      const err = new Error(msg) as Error & { code?: string };
      if (/invalid|expired|revoked/i.test(msg)) err.code = "reauth_required";
      throw err;
    }
    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token ?? refreshToken,
      accessTokenExpiresAt: new Date(
        Date.now() + Number(json.expires_in ?? 7200) * 1000,
      ),
    };
  },

  async validate(accessToken) {
    const res = await fetch("https://api.twitter.com/2/users/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) return { ok: true };
    return { ok: false, reason: `HTTP ${res.status}` };
  },

  async publish({ accessToken, content }) {
    const text = content.slice(0, 280);
    const res = await fetch("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      data?: { id?: string };
      detail?: string;
      title?: string;
    };
    if (!res.ok || !json.data?.id) {
      const msg = json.detail || json.title || `X publish failed HTTP ${res.status}`;
      const err = new Error(msg) as Error & { code?: string };
      if (/duplicate|forbidden|unauthorized/i.test(msg) || res.status === 401) {
        err.code = res.status === 401 ? "reauth_required" : "policy_rejected";
      }
      throw err;
    }
    return { externalPostId: json.data.id };
  },
};
