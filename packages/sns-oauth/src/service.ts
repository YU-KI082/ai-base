import { createHmac, timingSafeEqual } from "node:crypto";
import { openSecret, sealSecret } from "@ai-base/auth";
import { repos } from "@ai-base/database";
import { instagramProvider } from "./instagram.js";
import { tiktokProvider } from "./tiktok.js";
import { xProvider } from "./x.js";
import { threadsProvider } from "./threads.js";
import {
  OAUTH_PROVIDERS,
  REFRESH_SKEW_MS,
  connectionStatusLabel,
  isOAuthProvider,
  oauthProviderForPlatform,
  type ConnectionStatus,
  type OAuthProvider,
  type OAuthProviderPort,
  type TokenBundle,
} from "./types.js";

const providers: Record<OAuthProvider, OAuthProviderPort> = {
  instagram: instagramProvider,
  tiktok: tiktokProvider,
  x: xProvider,
  threads: threadsProvider,
};

export function getProvider(provider: OAuthProvider): OAuthProviderPort {
  return providers[provider];
}

function stateSecret(): string {
  return (
    process.env.OAUTH_STATE_SECRET?.trim() ||
    process.env.TOKEN_ENCRYPTION_KEY?.trim() ||
    process.env.ADMIN_OPS_SECRET?.trim() ||
    ""
  );
}

export function createOAuthState(provider: OAuthProvider): string {
  const secret = stateSecret();
  if (!secret) throw new Error("OAUTH_STATE_SECRET or TOKEN_ENCRYPTION_KEY required");
  const nonce = `${Date.now()}.${Math.random().toString(36).slice(2)}`;
  const payload = `${provider}.${nonce}`;
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyOAuthState(state: string): OAuthProvider {
  const secret = stateSecret();
  const parts = state.split(".");
  if (parts.length < 3) throw new Error("Invalid OAuth state");
  const sig = parts.pop()!;
  const payload = parts.join(".");
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error("Invalid OAuth state signature");
  }
  const provider = parts[0]!;
  if (!isOAuthProvider(provider)) throw new Error("Unknown OAuth provider in state");
  const ts = Number(parts[1]);
  if (!Number.isFinite(ts) || Date.now() - ts > 15 * 60 * 1000) {
    throw new Error("OAuth state expired");
  }
  return provider;
}

export function oauthRedirectUri(provider: OAuthProvider, siteUrl: string): string {
  const base = siteUrl.replace(/\/$/, "");
  return `${base}/api/v1/admin/social/oauth/${provider}/callback`;
}

function publicConnectionView(row: {
  provider: string;
  status: string;
  accountLabel: string | null;
  externalAccountId: string | null;
  scopes: string[];
  accessTokenExpiresAt: Date | null;
  lastRefreshedAt: Date | null;
  lastValidatedAt: Date | null;
  lastError: string | null;
  reauthRequiredAt: Date | null;
  accessTokenCipher: string | null;
}) {
  return {
    provider: row.provider,
    status: row.status as ConnectionStatus,
    statusLabelJa: connectionStatusLabel(row.status, "ja"),
    statusLabelEn: connectionStatusLabel(row.status, "en"),
    accountLabel: row.accountLabel,
    externalAccountId: row.externalAccountId,
    scopes: row.scopes,
    accessTokenExpiresAt: row.accessTokenExpiresAt?.toISOString() ?? null,
    lastRefreshedAt: row.lastRefreshedAt?.toISOString() ?? null,
    lastValidatedAt: row.lastValidatedAt?.toISOString() ?? null,
    lastError: row.lastError,
    reauthRequiredAt: row.reauthRequiredAt?.toISOString() ?? null,
    configured: isOAuthProvider(row.provider)
      ? getProvider(row.provider).isConfigured()
      : false,
    hasTokens: Boolean(row.accessTokenCipher),
  };
}

export async function listConnectionSummaries() {
  const existing = await repos.snsOAuth.list();
  const byProvider = new Map(existing.map((r) => [r.provider, r]));
  return OAUTH_PROVIDERS.map((provider) => {
    const row = byProvider.get(provider);
    if (row) return publicConnectionView(row);
    return {
      provider,
      status: "disconnected" as ConnectionStatus,
      statusLabelJa: connectionStatusLabel("disconnected", "ja"),
      statusLabelEn: connectionStatusLabel("disconnected", "en"),
      accountLabel: null,
      externalAccountId: null,
      scopes: [] as string[],
      accessTokenExpiresAt: null,
      lastRefreshedAt: null,
      lastValidatedAt: null,
      lastError: null,
      reauthRequiredAt: null,
      configured: getProvider(provider).isConfigured(),
      hasTokens: false,
    };
  });
}

async function persistTokens(provider: OAuthProvider, tokens: TokenBundle) {
  await repos.snsOAuth.upsertConnection(provider, {
    status: "connected",
    externalAccountId: tokens.externalAccountId ?? undefined,
    accountLabel: tokens.accountLabel ?? undefined,
    scopes: tokens.scopes ?? [],
    accessTokenCipher: sealSecret(tokens.accessToken),
    refreshTokenCipher: tokens.refreshToken
      ? sealSecret(tokens.refreshToken)
      : null,
    accessTokenExpiresAt: tokens.accessTokenExpiresAt,
    refreshTokenExpiresAt: tokens.refreshTokenExpiresAt ?? null,
    lastRefreshedAt: new Date(),
    lastValidatedAt: new Date(),
    lastError: null,
    reauthRequiredAt: null,
    metadata: (tokens.metadata as object | undefined) ?? undefined,
  });
}

export async function completeOAuthCallback(input: {
  provider: OAuthProvider;
  code: string;
  siteUrl: string;
}) {
  const provider = getProvider(input.provider);
  if (!provider.isConfigured()) {
    throw new Error(`${input.provider} OAuth app credentials are not configured`);
  }
  const tokens = await provider.exchangeCode({
    code: input.code,
    redirectUri: oauthRedirectUri(input.provider, input.siteUrl),
  });
  await persistTokens(input.provider, tokens);
  return listConnectionSummaries();
}

export async function refreshConnection(
  provider: OAuthProvider,
): Promise<{ ok: boolean; reauthRequired?: boolean; error?: string }> {
  const row = await repos.snsOAuth.findByProvider(provider);
  if (!row?.accessTokenCipher) {
    return { ok: false, reauthRequired: true, error: "Not connected" };
  }
  const port = getProvider(provider);
  if (!port.isConfigured()) {
    return { ok: false, error: "Provider credentials missing" };
  }

  await repos.snsOAuth.markStatus(provider, "auto_refreshing");
  try {
    const accessToken = openSecret(row.accessTokenCipher);
    const refreshToken = row.refreshTokenCipher
      ? openSecret(row.refreshTokenCipher)
      : accessToken;
    const tokens = await port.refresh({ refreshToken, accessToken });
    await persistTokens(provider, {
      ...tokens,
      externalAccountId: tokens.externalAccountId ?? row.externalAccountId,
      accountLabel: tokens.accountLabel ?? row.accountLabel,
      scopes: tokens.scopes ?? row.scopes,
    });
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const code = (error as { code?: string }).code;
    const needsReauth =
      code === "reauth_required" ||
      /reauth|revoked|expired|invalid.?token|OAuthException|authorize/i.test(
        message,
      );
    if (needsReauth) {
      await repos.snsOAuth.markReauthRequired(provider, message);
      return { ok: false, reauthRequired: true, error: message };
    }
    await repos.snsOAuth.upsertConnection(provider, {
      status: "connected",
      lastError: message.slice(0, 2000),
    });
    return { ok: false, error: message };
  }
}

export async function validateConnection(provider: OAuthProvider) {
  const row = await repos.snsOAuth.findByProvider(provider);
  if (!row?.accessTokenCipher) {
    return { ok: false as const, status: "disconnected" as const, reason: "Not connected" };
  }
  if (row.status === "reauth_required") {
    return {
      ok: false as const,
      status: "reauth_required" as const,
      reason: row.lastError ?? "Re-authentication required",
    };
  }
  try {
    const accessToken = openSecret(row.accessTokenCipher);
    const expiresAt = row.accessTokenExpiresAt?.getTime() ?? 0;
    if (expiresAt && expiresAt - Date.now() < REFRESH_SKEW_MS) {
      const refreshed = await refreshConnection(provider);
      if (!refreshed.ok) {
        return {
          ok: false as const,
          status: (refreshed.reauthRequired
            ? "reauth_required"
            : row.status) as ConnectionStatus,
          reason: refreshed.error ?? "Refresh failed",
        };
      }
    }
    const latest = await repos.snsOAuth.findByProvider(provider);
    const token = latest?.accessTokenCipher
      ? openSecret(latest.accessTokenCipher)
      : accessToken;
    const check = await getProvider(provider).validate(token);
    await repos.snsOAuth.upsertConnection(provider, {
      lastValidatedAt: new Date(),
      lastError: check.ok ? null : check.reason ?? "Validation failed",
      status: check.ok ? "connected" : "reauth_required",
      ...(check.ok
        ? { reauthRequiredAt: null }
        : { reauthRequiredAt: new Date() }),
      ...(!check.ok
        ? { accessTokenCipher: null, refreshTokenCipher: null }
        : {}),
    });
    return check.ok
      ? { ok: true as const, status: "connected" as const }
      : {
          ok: false as const,
          status: "reauth_required" as const,
          reason: check.reason ?? "Validation failed",
        };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await repos.snsOAuth.markReauthRequired(provider, message);
    return {
      ok: false as const,
      status: "reauth_required" as const,
      reason: message,
    };
  }
}

/** Ensure OAuth connection is healthy before external publish. */
export async function ensureReadyForPublish(platform: string) {
  // note uses draft-queue provider — no OAuth required
  if (platform === "note") {
    return { ok: true as const, provider: null };
  }
  const provider = oauthProviderForPlatform(platform);
  if (!provider) {
    return {
      ok: false as const,
      reason: `Platform ${platform} has no OAuth publisher yet`,
    };
  }
  const result = await validateConnection(provider);
  if (!result.ok) {
    return {
      ok: false as const,
      provider,
      status: result.status,
      reason: result.reason ?? "Connection not ready",
    };
  }
  return { ok: true as const, provider };
}

export async function refreshDueConnections() {
  const due = await repos.snsOAuth.listNeedingRefresh(REFRESH_SKEW_MS);
  const results: Array<{
    provider: string;
    ok: boolean;
    reauthRequired?: boolean;
    error?: string;
  }> = [];
  for (const row of due) {
    if (!isOAuthProvider(row.provider)) continue;
    results.push({
      provider: row.provider,
      ...(await refreshConnection(row.provider)),
    });
  }
  return results;
}

export async function getAccessToken(provider: OAuthProvider): Promise<string | null> {
  const ready = await validateConnection(provider);
  if (!ready.ok) return null;
  const row = await repos.snsOAuth.findByProvider(provider);
  if (!row?.accessTokenCipher) return null;
  return openSecret(row.accessTokenCipher);
}
