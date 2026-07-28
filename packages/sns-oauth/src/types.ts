export const OAUTH_PROVIDERS = ["instagram", "tiktok"] as const;
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

export function isOAuthProvider(value: string): value is OAuthProvider {
  return (OAUTH_PROVIDERS as readonly string[]).includes(value);
}

/** Platforms that require OAuth before external publish. */
export function oauthProviderForPlatform(platform: string): OAuthProvider | null {
  if (platform === "instagram") return "instagram";
  if (platform === "tiktok") return "tiktok";
  return null;
}

export type ConnectionStatus =
  | "connected"
  | "auto_refreshing"
  | "reauth_required"
  | "disconnected";

export const CONNECTION_STATUS_LABEL_JA: Record<ConnectionStatus, string> = {
  connected: "連携済み",
  auto_refreshing: "自動更新中",
  reauth_required: "再認証必要",
  disconnected: "未連携",
};

export const CONNECTION_STATUS_LABEL_EN: Record<ConnectionStatus, string> = {
  connected: "Connected",
  auto_refreshing: "Auto-refreshing",
  reauth_required: "Re-auth required",
  disconnected: "Disconnected",
};

export function connectionStatusLabel(
  status: string,
  locale: "ja" | "en" = "ja",
): string {
  const map = locale === "ja" ? CONNECTION_STATUS_LABEL_JA : CONNECTION_STATUS_LABEL_EN;
  return map[status as ConnectionStatus] ?? status;
}

export type TokenBundle = {
  accessToken: string;
  refreshToken?: string | null;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt?: Date | null;
  externalAccountId?: string | null;
  accountLabel?: string | null;
  scopes?: string[];
  metadata?: Record<string, unknown>;
};

export type OAuthProviderPort = {
  provider: OAuthProvider;
  isConfigured(): boolean;
  getAuthorizationUrl(input: { state: string; redirectUri: string }): string;
  exchangeCode(input: {
    code: string;
    redirectUri: string;
  }): Promise<TokenBundle>;
  refresh(input: {
    refreshToken: string;
    accessToken?: string;
  }): Promise<TokenBundle>;
  validate(accessToken: string): Promise<{ ok: boolean; reason?: string }>;
  publish?(input: {
    accessToken: string;
    content: string;
    mediaUrl?: string | null;
  }): Promise<{ externalPostId: string }>;
};

/** Refresh when access token expires within this window. */
export const REFRESH_SKEW_MS = 30 * 60 * 1000;
