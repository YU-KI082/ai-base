"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getDictionary, statusLabel, type Locale } from "@ai-base/i18n";
import { adminMutationHeaders } from "@/lib/admin-fetch";

type Post = {
  id: string;
  platform: string;
  locale: string;
  status: string;
  content: string;
  toolId: string | null;
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
};

export function SocialAdminClient({
  locale,
  initialPosts,
  connections,
  oauthFlash,
}: {
  locale: Locale;
  initialPosts: Post[];
  connections: Connection[];
  oauthFlash: { type: "ok" | "error"; message: string } | null;
}) {
  const router = useRouter();
  const dict = getDictionary(locale);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [message, setMessage] = useState<string | null>(
    oauthFlash?.message ?? null,
  );

  const posts =
    filter === "all" ? initialPosts : initialPosts.filter((p) => p.status === filter);

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

  const filters = [
    { key: "all", label: dict.common.all },
    { key: "draft", label: statusLabel(locale, "draft") },
    { key: "ready", label: statusLabel(locale, "ready") },
    { key: "published", label: statusLabel(locale, "published") },
    { key: "rejected", label: statusLabel(locale, "rejected") },
  ];

  const needsReauth = connections.some((c) => c.status === "reauth_required");

  return (
    <div>
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

      <section className="card-surface" style={{ padding: "1.15rem", marginBottom: "1.5rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "0.75rem",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: "1.05rem" }}>{dict.admin.oauthConnections}</h2>
            <p className="muted" style={{ margin: "0.35rem 0 0", fontSize: 13 }}>
              {dict.admin.oauthConnectionsHint}
            </p>
          </div>
          <button
            className="btn btn-ghost"
            disabled={busy}
            type="button"
            onClick={() => void runRefreshTick()}
          >
            {dict.admin.oauthRunRefresh}
          </button>
        </div>
        <ul style={{ listStyle: "none", padding: 0, margin: "1rem 0 0", display: "grid", gap: "0.75rem" }}>
          {connections.map((c) => {
            const label = locale === "ja" ? c.statusLabelJa : c.statusLabelEn;
            return (
              <li
                key={c.provider}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "0.75rem",
                  flexWrap: "wrap",
                  alignItems: "center",
                  paddingTop: "0.75rem",
                  borderTop: "1px solid var(--border)",
                }}
              >
                <div>
                  <strong style={{ textTransform: "capitalize" }}>{c.provider}</strong>
                  <span className="pill" style={{ marginLeft: 8 }}>
                    {label}
                  </span>
                  {c.accountLabel ? (
                    <span className="muted" style={{ marginLeft: 8, fontSize: 13 }}>
                      {c.accountLabel}
                    </span>
                  ) : null}
                  {!c.configured ? (
                    <p className="muted" style={{ margin: "0.25rem 0 0", fontSize: 12 }}>
                      {dict.admin.oauthEnvMissing}
                    </p>
                  ) : null}
                  {c.lastError ? (
                    <p style={{ margin: "0.25rem 0 0", fontSize: 12, color: "var(--danger)" }}>
                      {c.lastError}
                    </p>
                  ) : null}
                </div>
                <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                  <a
                    className="btn btn-primary"
                    href={`/api/v1/admin/social/oauth/${c.provider}/start`}
                    style={{ pointerEvents: busy || !c.configured ? "none" : undefined, opacity: c.configured ? 1 : 0.5 }}
                  >
                    {c.hasTokens ? dict.admin.oauthReconnect : dict.admin.oauthConnect}
                  </a>
                  <button
                    className="btn btn-ghost"
                    disabled={busy || !c.hasTokens}
                    type="button"
                    onClick={() => void connectionAction(c.provider, "refresh")}
                  >
                    {dict.admin.oauthRefreshNow}
                  </button>
                  <button
                    className="btn btn-ghost"
                    disabled={busy || !c.hasTokens}
                    type="button"
                    onClick={() => void connectionAction(c.provider, "validate")}
                  >
                    {dict.admin.oauthValidate}
                  </button>
                  <button
                    className="btn btn-danger"
                    disabled={busy || !c.hasTokens}
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
      </section>

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
                <div>
                  <strong>
                    {post.platform} · {post.locale}
                  </strong>
                  <span className="pill" style={{ marginLeft: 8 }}>
                    {statusLabel(locale, post.status)}
                  </span>
                  <p style={{ whiteSpace: "pre-wrap", marginBottom: 0 }}>{post.content}</p>
                </div>
                <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", alignItems: "start" }}>
                  <button className="btn btn-ghost" disabled={busy} onClick={() => void setStatus(post.id, "ready")}>
                    {dict.admin.markReady}
                  </button>
                  <button className="btn btn-primary" disabled={busy} onClick={() => void setStatus(post.id, "published")}>
                    {dict.admin.markPublished}
                  </button>
                  <button className="btn btn-danger" disabled={busy} onClick={() => void setStatus(post.id, "rejected")}>
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
