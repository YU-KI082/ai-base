"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { getDictionary, statusLabel, type Locale } from "@ai-base/i18n";
import { adminMutationHeaders } from "@/lib/admin-fetch";

type Post = {
  id: string;
  platform: string;
  locale: string;
  status: string;
  content: string;
  toolId: string | null;
  contentKind: string | null;
  durationSec: number | null;
  hook: string | null;
  cta: string | null;
  hashtags: string[];
  mediaUrl: string | null;
  lastPublishError: string | null;
  externalPostId: string | null;
  scriptCount: number;
  scripts: Array<{
    durationSec: number | null;
    hook: string | null;
    cta: string | null;
    hashtags: string[];
    aiBaseCta: string | null;
  }>;
  hasAssetPackage: boolean;
  metrics: {
    plays: number | null;
    avgWatchSec: number | null;
    watchRetentionRate: number | null;
    hold3SecRate: number | null;
    completionRate: number | null;
    likesCount: number | null;
    commentsCount: number | null;
    sharesCount: number | null;
    savesCount: number | null;
    profileVisits: number | null;
    affiliateClicks: number | null;
    conversions: number | null;
    source: string;
  } | null;
  createdAt: string;
};

type Connection = {
  provider: string;
  status: string;
  statusLabelJa: string;
  statusLabelEn: string;
  accountLabel: string | null;
  accessTokenExpiresAt: string | null;
  lastError: string | null;
  configured: boolean;
  hasTokens: boolean;
  reauthRequiredAt: string | null;
  authType?: "oauth" | "draft_queue";
};

type OAuthSetupItem = {
  provider: string;
  configured: boolean;
  missingEnv: string[];
  callbackPath: string;
  authType: "oauth" | "draft_queue";
};

const STATUS_FILTERS = [
  "all",
  "draft",
  "pending_approval",
  "ready",
  "scheduled",
  "published",
  "failed",
  "retry",
  "rejected",
] as const;

export function SocialAdminClient({
  locale,
  initialPosts,
  connections,
  oauthFlash,
  toolSlugs,
  opsSummary,
  oauthSetup,
}: {
  locale: Locale;
  initialPosts: Post[];
  connections: Connection[];
  oauthFlash: { type: "ok" | "error"; message: string } | null;
  toolSlugs: string[];
  opsSummary: {
    mode: string;
    emergencyStop: boolean;
    counts: {
      scheduledToday: number;
      generating: number;
      published: number;
      failed: number;
      retry: number;
    };
    plays: number;
    clicks: number;
    conversions: number;
    revenueUsd: number;
    profitUsd: number;
  };
  oauthSetup?: {
    tokenEncryptionConfigured: boolean;
    providers: OAuthSetupItem[];
  };
}) {
  const router = useRouter();
  const dict = getDictionary(locale);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [message, setMessage] = useState<string | null>(
    oauthFlash?.message ?? null,
  );
  const [genSlug, setGenSlug] = useState(toolSlugs[0] ?? "chatgpt");
  const [genKind, setGenKind] = useState("tool_intro");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const posts = useMemo(() => {
    return initialPosts.filter((p) => {
      if (filter !== "all" && p.status !== filter) return false;
      if (platformFilter !== "all" && p.platform !== platformFilter) return false;
      return true;
    });
  }, [filter, platformFilter, initialPosts]);

  async function opsAction(action: string) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/v1/admin/ops", {
        method: "POST",
        headers: adminMutationHeaders(),
        body: JSON.stringify({ action }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(body.error ?? dict.common.error);
        return;
      }
      setMessage(
        action === "run_full_auto"
          ? locale === "ja"
            ? "フルオート 1 サイクルを実行しました"
            : "Full-auto cycle completed"
          : dict.common.success,
      );
      router.refresh();
    } finally {
      setBusy(false);
    }
  }
  async function setStatus(id: string, status: string) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/v1/admin/social/${id}`, {
        method: "PATCH",
        headers: adminMutationHeaders(),
        body: JSON.stringify({ status }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(body.error ?? dict.common.error);
        return;
      }
      if (body.message) setMessage(body.message);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function generateTikTok() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/v1/admin/social/tiktok/generate", {
        method: "POST",
        headers: adminMutationHeaders(),
        body: JSON.stringify({
          toolSlug: genSlug,
          contentKind: genKind,
          locale: locale === "en" ? "en" : "ja",
          status: "draft",
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(body.error ?? dict.common.error);
        return;
      }
      setMessage(
        locale === "ja"
          ? "TikTok台本（15/30/60秒）と動画素材プランを生成しました"
          : "Generated TikTok scripts (15/30/60s) + media plan",
      );
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function connectionAction(
    provider: string,
    action: "refresh" | "validate" | "disconnect",
  ) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/v1/admin/social/connections/${provider}`, {
        method: "POST",
        headers: adminMutationHeaders(),
        body: JSON.stringify({ action }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(body.error ?? dict.common.error);
        return;
      }
      if (body.reauthRequired) {
        setMessage(dict.admin.oauthReauthNeeded);
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function runRefreshTick() {
    setBusy(true);
    try {
      const res = await fetch("/api/v1/admin/social/oauth/refresh-tick", {
        method: "POST",
        headers: adminMutationHeaders(),
        body: JSON.stringify({}),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(body.error ?? dict.common.error);
        return;
      }
      setMessage(dict.admin.oauthRefreshQueued);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function attachMedia(id: string) {
    const url = window.prompt(
      locale === "ja"
        ? "9:16動画の公開URL（TikTok PULL_FROM_URL用）"
        : "Public 9:16 media URL for TikTok PULL_FROM_URL",
      "https://",
    );
    if (url == null || url === "") return;
    setBusy(true);
    try {
      const res = await fetch(`/api/v1/admin/social/${id}/media?action=attach_media`, {
        method: "POST",
        headers: adminMutationHeaders(),
        body: JSON.stringify({ mediaUrl: url }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(body.error ?? dict.common.error);
        return;
      }
      setMessage(locale === "ja" ? "mediaUrl を保存しました" : "mediaUrl saved");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function syncMetrics(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/v1/admin/social/${id}/media?action=sync_metrics`, {
        method: "POST",
        headers: adminMutationHeaders(),
        body: JSON.stringify({ windowHours: 24 }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(body.error ?? dict.common.error);
        return;
      }
      setMessage(
        body.data?.pulled || body.pulled
          ? locale === "ja"
            ? "TikTok公式メトリクスを同期しました"
            : "Synced TikTok official metrics"
          : body.data?.message ||
              body.message ||
              (locale === "ja"
                ? "公式API未対応のため手動取り込みが必要です"
                : "Official API unavailable — ingest manually"),
      );
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const filters = STATUS_FILTERS.map((key) => ({
    key,
    label: key === "all" ? dict.common.all : statusLabel(locale, key),
  }));

  const needsReauth = connections.some((c) => c.status === "reauth_required");
  const platforms = ["all", "tiktok", "instagram", "x", "threads", "note"];
  const c = opsSummary.counts;

  return (
    <div>
      {opsSummary.emergencyStop ? (
        <p
          className="card-surface"
          style={{
            padding: "0.85rem 1rem",
            marginBottom: "1rem",
            borderColor: "var(--danger)",
            color: "var(--danger)",
          }}
        >
          {locale === "ja"
            ? "緊急停止中 — 外部投稿は実行されません"
            : "Emergency stop ON — no external publishes"}
        </p>
      ) : null}
      {needsReauth ? (
        <p
          className="card-surface"
          style={{
            padding: "0.85rem 1rem",
            marginBottom: "1rem",
            borderColor: "var(--danger)",
            color: "var(--danger)",
          }}
        >
          {dict.admin.oauthReauthBanner}
        </p>
      ) : null}
      {message ? (
        <p className="muted" style={{ marginBottom: "1rem" }}>
          {message}
        </p>
      ) : null}

      <section className="card-surface" style={{ padding: "1rem", marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>
              {locale === "ja" ? "完全自動運用ダッシュボード" : "Full-auto dashboard"}
            </h2>
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              mode={opsSummary.mode} ·{" "}
              {locale === "ja"
                ? "通常投稿の承認は不要。売上・利益・重大エラーのみ確認"
                : "No approval for normal posts. Review revenue / critical errors only"}
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
            <button
              className="btn btn-primary"
              disabled={busy}
              type="button"
              onClick={() => void opsAction("run_full_auto")}
            >
              {locale === "ja" ? "フルオート 1 サイクル" : "Run full-auto cycle"}
            </button>
            <button
              className="btn btn-danger"
              disabled={busy}
              type="button"
              onClick={() => void opsAction("emergency_stop")}
            >
              {locale === "ja" ? "緊急停止" : "Emergency stop"}
            </button>
            <button
              className="btn btn-ghost"
              disabled={busy}
              type="button"
              onClick={() => void opsAction("resume")}
            >
              {locale === "ja" ? "再開" : "Resume"}
            </button>
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
            gap: "0.65rem",
            marginTop: "1rem",
          }}
        >
          {[
            [locale === "ja" ? "本日予定" : "Today", c.scheduledToday],
            [locale === "ja" ? "生成中" : "Generating", c.generating],
            [locale === "ja" ? "投稿済" : "Published", c.published],
            [locale === "ja" ? "失敗" : "Failed", c.failed],
            [locale === "ja" ? "再試行" : "Retry", c.retry],
            [locale === "ja" ? "再生" : "Plays", opsSummary.plays],
            [locale === "ja" ? "クリック" : "Clicks", opsSummary.clicks],
            ["CV", opsSummary.conversions],
            [locale === "ja" ? "売上$" : "Rev$", opsSummary.revenueUsd.toFixed(0)],
            [locale === "ja" ? "利益$" : "Profit$", opsSummary.profitUsd.toFixed(0)],
          ].map(([label, value]) => (
            <div key={String(label)} style={{ padding: "0.5rem 0" }}>
              <div className="muted" style={{ fontSize: 12 }}>
                {label}
              </div>
              <div style={{ fontSize: "1.15rem", fontWeight: 700 }}>{value}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="card-surface" style={{ padding: "1rem", marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>{dict.admin.oauthConnections}</h2>
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              {dict.admin.oauthConnectionsHint}
            </p>
          </div>
          <button className="btn btn-ghost" disabled={busy} type="button" onClick={() => void runRefreshTick()}>
            {dict.admin.oauthRunRefresh}
          </button>
        </div>
        <ul style={{ listStyle: "none", padding: 0, margin: "1rem 0 0", display: "grid", gap: "0.65rem" }}>
          {connections.map((c) => {
            const label = locale === "ja" ? c.statusLabelJa : c.statusLabelEn;
            const isNote = c.provider === "note" || c.authType === "draft_queue";
            const connectHref = isNote
              ? "/api/v1/admin/social/oauth/note/connect"
              : `/api/v1/admin/social/oauth/${c.provider}/start`;
            const connected = c.status === "connected" || c.status === "auto_refreshing";
            return (
              <li
                key={c.provider}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "0.75rem",
                  flexWrap: "wrap",
                  padding: "0.65rem 0",
                  borderTop: "1px solid var(--border)",
                }}
              >
                <div>
                  <strong style={{ textTransform: "capitalize" }}>{c.provider}</strong>
                  <span className="pill" style={{ marginLeft: 8 }}>
                    {connected
                      ? locale === "ja"
                        ? "Connected"
                        : "Connected"
                      : label}
                  </span>
                  {c.accountLabel ? (
                    <span className="muted" style={{ marginLeft: 8, fontSize: 13 }}>
                      {c.accountLabel}
                    </span>
                  ) : null}
                  {!c.configured && !isNote ? (
                    <div className="muted" style={{ fontSize: 12 }}>
                      {dict.admin.oauthEnvMissing}
                    </div>
                  ) : null}
                  {isNote ? (
                    <div className="muted" style={{ fontSize: 12 }}>
                      {locale === "ja"
                        ? "公式APIなし — 下書きキュー（パスワードログイン禁止）"
                        : "Draft queue only — password login forbidden"}
                    </div>
                  ) : null}
                  {c.lastError ? (
                    <div style={{ color: "var(--danger)", fontSize: 12 }}>{c.lastError}</div>
                  ) : null}
                </div>
                <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                  <a className="btn btn-primary" href={connectHref}>
                    {connected
                      ? dict.admin.oauthReconnect
                      : isNote
                        ? locale === "ja"
                          ? "ワンクリック連携"
                          : "Connect (one click)"
                        : dict.admin.oauthConnect}
                  </a>
                  <button
                    className="btn btn-ghost"
                    disabled={busy || isNote || !c.hasTokens}
                    type="button"
                    onClick={() => void connectionAction(c.provider, "refresh")}
                  >
                    {dict.admin.oauthRefreshNow}
                  </button>
                  <button
                    className="btn btn-ghost"
                    disabled={busy || isNote || !c.hasTokens}
                    type="button"
                    onClick={() => void connectionAction(c.provider, "validate")}
                  >
                    {dict.admin.oauthValidate}
                  </button>
                  <button
                    className="btn btn-danger"
                    disabled={busy || (!c.hasTokens && !connected)}
                    type="button"
                    onClick={() => void connectionAction(c.provider, "disconnect")}
                  >
                    {dict.admin.oauthDisconnect}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        {oauthSetup ? (
          <div
            style={{
              marginTop: "1rem",
              padding: "0.75rem",
              border: "1px solid var(--border)",
              fontSize: 12,
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 6 }}>
              {locale === "ja" ? "本番OAuthセットアップ" : "Production OAuth setup"}
            </div>
            <div className="muted" style={{ marginBottom: 8 }}>
              TOKEN_ENCRYPTION_KEY:{" "}
              {oauthSetup.tokenEncryptionConfigured ? "OK" : "MISSING"}
            </div>
            <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
              {oauthSetup.providers.map((p) => (
                <li key={p.provider} style={{ marginBottom: 6 }}>
                  <strong style={{ textTransform: "capitalize" }}>{p.provider}</strong>
                  {": "}
                  {p.configured
                    ? locale === "ja"
                      ? "アプリ設定済み"
                      : "App configured"
                    : `missing ${p.missingEnv.join(", ")}`}
                  {p.authType === "oauth" ? (
                    <div className="muted">Callback: {p.callbackPath}</div>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <p className="muted" style={{ fontSize: 12, marginBottom: 0, marginTop: "0.75rem" }}>
          {locale === "ja"
            ? "note は公式API未設定時に投稿待ちキューへ保存。ID/パスワード自動ログインは禁止"
            : "note queues drafts without API. Password browser login is forbidden"}
        </p>
      </section>

      <section className="card-surface" style={{ padding: "1rem", marginBottom: "1.25rem" }}>
        <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>
          {locale === "ja" ? "手動: 単体TikTok生成（デバッグ用）" : "Manual TikTok generate (debug)"}
        </h2>
        <p className="muted" style={{ fontSize: 13 }}>
          {locale === "ja"
            ? "通常運用はフルオートに任せます。デバッグ時のみ使用"
            : "Prefer full-auto; use this only for debugging"}
        </p>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "end" }}>
          <label>
            tool
            <select className="input" value={genSlug} onChange={(e) => setGenSlug(e.target.value)}>
              {toolSlugs.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label>
            kind
            <select className="input" value={genKind} onChange={(e) => setGenKind(e.target.value)}>
              {[
                "tool_intro",
                "compare",
                "ranking",
                "ai_news",
                "howto",
                "failure",
                "before_after",
                "beginner",
              ].map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>
          <button className="btn btn-ghost" disabled={busy} type="button" onClick={() => void generateTikTok()}>
            {locale === "ja" ? "TikTok台本を生成" : "Generate TikTok"}
          </button>
        </div>
      </section>

      <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.65rem", flexWrap: "wrap" }}>
        {platforms.map((p) => (
          <button
            key={p}
            className={`btn ${platformFilter === p ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setPlatformFilter(p)}
            type="button"
          >
            {p === "all" ? dict.common.all : p}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        {filters.map((s) => (
          <button
            key={s.key}
            className={`btn ${filter === s.key ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setFilter(s.key)}
            type="button"
          >
            {s.label}
          </button>
        ))}
      </div>
      {posts.length === 0 ? (
        <p className="muted">{dict.admin.socialEmpty}</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "0.75rem" }}>
          {posts.map((post) => (
            <li key={post.id} className="card-surface" style={{ padding: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
                <div style={{ maxWidth: "70ch" }}>
                  <strong>
                    {post.platform} · {post.locale}
                    {post.contentKind ? ` · ${post.contentKind}` : ""}
                    {post.durationSec ? ` · ${post.durationSec}s` : ""}
                  </strong>
                  <span className="pill" style={{ marginLeft: 8 }}>
                    {statusLabel(locale, post.status)}
                  </span>
                  {post.scriptCount > 0 ? (
                    <span className="pill" style={{ marginLeft: 6 }}>
                      scripts×{post.scriptCount}
                    </span>
                  ) : null}
                  {post.hook ? (
                    <p style={{ margin: "0.45rem 0 0", fontWeight: 600 }}>{post.hook}</p>
                  ) : null}
                  <p style={{ whiteSpace: "pre-wrap", marginBottom: 0, fontSize: 14 }}>
                    {post.content.slice(0, 500)}
                    {post.content.length > 500 ? "…" : ""}
                  </p>
                  {post.hashtags.length > 0 ? (
                    <p className="muted" style={{ fontSize: 12 }}>
                      {post.hashtags.join(" ")}
                    </p>
                  ) : null}
                  {post.lastPublishError ? (
                    <p style={{ color: "var(--danger)", fontSize: 12, marginBottom: 0 }}>
                      {post.lastPublishError}
                    </p>
                  ) : null}
                  {post.externalPostId ? (
                    <p className="muted" style={{ fontSize: 12, marginBottom: 0 }}>
                      external: {post.externalPostId}
                    </p>
                  ) : null}
                  {post.mediaUrl ? (
                    <p className="muted" style={{ fontSize: 12, marginBottom: 0 }}>
                      media: {post.mediaUrl}
                    </p>
                  ) : null}
                  {post.hasAssetPackage ? (
                    <span className="pill" style={{ marginTop: 6, display: "inline-block" }}>
                      9:16 assets
                    </span>
                  ) : null}
                  {post.metrics ? (
                    <p className="muted" style={{ fontSize: 12, marginTop: "0.5rem" }}>
                      plays {post.metrics.plays ?? "—"} · 3s{" "}
                      {post.metrics.hold3SecRate != null
                        ? `${Math.round(post.metrics.hold3SecRate * 100)}%`
                        : "—"}{" "}
                      · complete{" "}
                      {post.metrics.completionRate != null
                        ? `${Math.round(post.metrics.completionRate * 100)}%`
                        : "—"}{" "}
                      · ❤ {post.metrics.likesCount ?? "—"} · 💬{" "}
                      {post.metrics.commentsCount ?? "—"} · share{" "}
                      {post.metrics.sharesCount ?? "—"} · save{" "}
                      {post.metrics.savesCount ?? "—"} · profile{" "}
                      {post.metrics.profileVisits ?? "—"} · AI BASE click{" "}
                      {post.metrics.affiliateClicks ?? "—"} · CV{" "}
                      {post.metrics.conversions ?? "—"} ({post.metrics.source})
                    </p>
                  ) : null}
                  {expandedId === post.id && post.scripts.length > 0 ? (
                    <div style={{ marginTop: "0.75rem", display: "grid", gap: "0.45rem" }}>
                      {post.scripts.map((s) => (
                        <div
                          key={`${post.id}-${s.durationSec}`}
                          className="card-surface"
                          style={{ padding: "0.65rem 0.8rem", background: "transparent" }}
                        >
                          <strong>{s.durationSec}s</strong>
                          <div style={{ fontSize: 13 }}>{s.hook}</div>
                          <div className="muted" style={{ fontSize: 12 }}>
                            CTA: {s.cta}
                          </div>
                          {s.aiBaseCta ? (
                            <div className="muted" style={{ fontSize: 12 }}>
                              {s.aiBaseCta}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", alignItems: "start" }}>
                  {post.platform === "tiktok" || post.platform === "instagram" ? (
                    <button
                      className="btn btn-ghost"
                      type="button"
                      onClick={() =>
                        setExpandedId((cur) => (cur === post.id ? null : post.id))
                      }
                    >
                      {expandedId === post.id
                        ? locale === "ja"
                          ? "台本を閉じる"
                          : "Hide scripts"
                        : locale === "ja"
                          ? "15/30/60台本"
                          : "15/30/60 scripts"}
                    </button>
                  ) : null}
                  {post.platform === "tiktok" || post.platform === "instagram" ? (
                    <button
                      className="btn btn-ghost"
                      disabled={busy}
                      type="button"
                      onClick={() => void attachMedia(post.id)}
                    >
                      {locale === "ja" ? "動画URL" : "Media URL"}
                    </button>
                  ) : null}
                  {(post.platform === "tiktok" || post.platform === "instagram") &&
                  post.status === "published" ? (
                    <button
                      className="btn btn-ghost"
                      disabled={busy}
                      type="button"
                      onClick={() => void syncMetrics(post.id)}
                    >
                      {locale === "ja" ? "分析同期" : "Sync metrics"}
                    </button>
                  ) : null}
                  <button className="btn btn-ghost" disabled={busy} onClick={() => void setStatus(post.id, "ready")}>
                    {dict.admin.markReady}
                  </button>
                  <button
                    className="btn btn-ghost"
                    disabled={busy}
                    onClick={() => void setStatus(post.id, "scheduled")}
                  >
                    {statusLabel(locale, "scheduled")}
                  </button>
                  <button
                    className="btn btn-primary"
                    disabled={busy}
                    onClick={() => void setStatus(post.id, "published")}
                  >
                    {dict.admin.markPublished}
                  </button>
                  {post.status === "failed" || post.status === "retry" ? (
                    <button
                      className="btn btn-ghost"
                      disabled={busy}
                      onClick={() => void setStatus(post.id, "retry")}
                    >
                      {statusLabel(locale, "retry")}
                    </button>
                  ) : null}
                  <button
                    className="btn btn-danger"
                    disabled={busy}
                    onClick={() => void setStatus(post.id, "rejected")}
                  >
                    {dict.common.reject}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
