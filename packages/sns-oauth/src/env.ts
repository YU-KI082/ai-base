/**
 * Resolve SNS OAuth app credentials from env (with common aliases).
 * Never log secret values.
 */

export function envFirst(...names: string[]): string | null {
  for (const name of names) {
    const v = process.env[name]?.trim();
    if (v) return v;
  }
  return null;
}

export function requireEnvFirst(...names: string[]): string {
  const v = envFirst(...names);
  if (!v) {
    throw new Error(
      `${names.join(" / ")} is not configured. Set the app credentials in Vercel env.`,
    );
  }
  return v;
}

export function instagramAppId(): string | null {
  return envFirst("INSTAGRAM_APP_ID", "META_APP_ID", "FACEBOOK_APP_ID");
}

export function instagramAppSecret(): string | null {
  return envFirst(
    "INSTAGRAM_APP_SECRET",
    "META_APP_SECRET",
    "FACEBOOK_APP_SECRET",
  );
}

export function isInstagramConfigured(): boolean {
  return Boolean(instagramAppId() && instagramAppSecret());
}

export function isTikTokConfigured(): boolean {
  return Boolean(
    envFirst("TIKTOK_CLIENT_KEY", "TIKTOK_APP_ID") &&
      envFirst("TIKTOK_CLIENT_SECRET", "TIKTOK_APP_SECRET"),
  );
}

export function isXConfigured(): boolean {
  return Boolean(
    envFirst("X_CLIENT_ID", "TWITTER_CLIENT_ID") &&
      envFirst("X_CLIENT_SECRET", "TWITTER_CLIENT_SECRET"),
  );
}

export function isThreadsConfigured(): boolean {
  return Boolean(
    (envFirst("THREADS_APP_ID") || instagramAppId()) &&
      (envFirst("THREADS_APP_SECRET") || instagramAppSecret()),
  );
}

export type OAuthSetupStatus = {
  provider: string;
  configured: boolean;
  missingEnv: string[];
  callbackPath: string;
  authType: "oauth" | "draft_queue";
};

export function oauthSetupStatus(siteUrl: string): OAuthSetupStatus[] {
  const base = siteUrl.replace(/\/$/, "");
  return [
    {
      provider: "instagram",
      configured: isInstagramConfigured(),
      missingEnv: [
        ...(!instagramAppId() ? ["INSTAGRAM_APP_ID"] : []),
        ...(!instagramAppSecret() ? ["INSTAGRAM_APP_SECRET"] : []),
      ],
      callbackPath: `${base}/api/v1/admin/social/oauth/instagram/callback`,
      authType: "oauth",
    },
    {
      provider: "tiktok",
      configured: isTikTokConfigured(),
      missingEnv: [
        ...(!envFirst("TIKTOK_CLIENT_KEY", "TIKTOK_APP_ID")
          ? ["TIKTOK_CLIENT_KEY"]
          : []),
        ...(!envFirst("TIKTOK_CLIENT_SECRET", "TIKTOK_APP_SECRET")
          ? ["TIKTOK_CLIENT_SECRET"]
          : []),
      ],
      callbackPath: `${base}/api/v1/admin/social/oauth/tiktok/callback`,
      authType: "oauth",
    },
    {
      provider: "x",
      configured: isXConfigured(),
      missingEnv: [
        ...(!envFirst("X_CLIENT_ID", "TWITTER_CLIENT_ID") ? ["X_CLIENT_ID"] : []),
        ...(!envFirst("X_CLIENT_SECRET", "TWITTER_CLIENT_SECRET")
          ? ["X_CLIENT_SECRET"]
          : []),
      ],
      callbackPath: `${base}/api/v1/admin/social/oauth/x/callback`,
      authType: "oauth",
    },
    {
      provider: "threads",
      configured: isThreadsConfigured(),
      missingEnv: isThreadsConfigured()
        ? []
        : ["THREADS_APP_ID or INSTAGRAM_APP_ID", "THREADS_APP_SECRET or INSTAGRAM_APP_SECRET"],
      callbackPath: `${base}/api/v1/admin/social/oauth/threads/callback`,
      authType: "oauth",
    },
    {
      provider: "note",
      configured: true,
      missingEnv: [],
      callbackPath: `${base}/admin/social`,
      authType: "draft_queue",
    },
  ];
}
