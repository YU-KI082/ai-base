"use client";

import { useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  STATUS_COLORS,
  STATUS_LABEL_JA,
  hasAffiliateLabel,
  isAffiliateStatus,
  type AffiliateStatus,
} from "@ai-base/affiliate-intel";
import { formatCurrency, formatPercent, getDictionary } from "@ai-base/i18n";
import { adminMutationHeaders } from "@/lib/admin-fetch";

type Lead = {
  id: string;
  aspKey: string;
  aspLabel: string;
  status: string;
  rewardText: string | null;
  rewardAmount: number | null;
  cookieDays: number | null;
  conversionTerms: string | null;
  appliedAt: string | null;
  approvedAt: string | null;
  notes: string | null;
};

type Item = {
  id: string;
  toolId: string;
  slug: string;
  name: string;
  homepageUrl: string;
  status: string;
  hasAffiliate: boolean | null;
  notes: string | null;
  links: Array<{
    id: string;
    label: string;
    url: string;
    network: string | null;
    commission: string | null;
    priority: number;
    isHealthy: boolean;
  }>;
  leads: Lead[];
  metrics: {
    clicks: number;
    conversions: number;
    sales: number;
    rewardAmount: number;
    cvr: number | null;
    epc: number | null;
  };
};

const STATUSES: AffiliateStatus[] = [
  "uninvestigated",
  "investigating",
  "available",
  "applying",
  "partnered",
  "unavailable",
];

export function AffiliateIntelClient({
  locale,
  initialItems,
  legacyLinks,
  tools,
}: {
  locale: "ja" | "en";
  initialItems: Item[];
  legacyLinks: Array<{
    id: string;
    toolId: string;
    toolSlug: string;
    label: string;
    url: string;
    network: string | null;
    commission: string | null;
    priority: number;
    isHealthy: boolean;
  }>;
  tools: Array<{ id: string; slug: string; name: string }>;
}) {
  const router = useRouter();
  const dict = getDictionary(locale);
  const a = dict.admin;
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [message, setMessage] = useState<string | null>(null);
  const [toolId, setToolId] = useState(tools[0]?.id ?? "");
  const [label, setLabel] = useState(dict.public.visitWebsite);
  const [url, setUrl] = useState("https://");
  const [network, setNetwork] = useState("official");
  const [priority, setPriority] = useState(10);

  const items = useMemo(() => {
    if (filter === "all") return initialItems;
    return initialItems.filter((i) => i.status === filter);
  }, [filter, initialItems]);

  const totals = useMemo(() => {
    return initialItems.reduce(
      (acc, i) => {
        acc.clicks += i.metrics.clicks;
        acc.conversions += i.metrics.conversions;
        acc.sales += i.metrics.sales;
        return acc;
      },
      { clicks: 0, conversions: 0, sales: 0 },
    );
  }, [initialItems]);

  async function backfill() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/v1/admin/affiliate-intel", {
        method: "POST",
        headers: adminMutationHeaders(),
        body: JSON.stringify({ action: "backfill" }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? res.statusText);
      setMessage("既存ツールの未確認登録をキューしました（affiliate agent 起動が必要）");
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function syncNow() {
    setBusy(true);
    try {
      const res = await fetch("/api/v1/admin/affiliate-intel", {
        method: "POST",
        headers: adminMutationHeaders(),
        body: JSON.stringify({ action: "sync_now" }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? res.statusText);
      setMessage(`同期完了: ${body.data?.created ?? 0} 件登録`);
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function patchLead(id: string, data: Record<string, unknown>) {
    setBusy(true);
    try {
      await fetch(`/api/v1/admin/affiliate-intel/leads/${id}`, {
        method: "PATCH",
        headers: adminMutationHeaders(),
        body: JSON.stringify(data),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function patchCase(id: string, data: Record<string, unknown>) {
    setBusy(true);
    try {
      await fetch(`/api/v1/admin/affiliate-intel/${id}`, {
        method: "PATCH",
        headers: adminMutationHeaders(),
        body: JSON.stringify(data),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function addConversion(toolIdValue: string) {
    const amount = window.prompt(a.rewardPrompt);
    if (amount == null || amount === "") return;
    const n = Number(amount);
    if (!Number.isFinite(n) || n < 0) {
      setMessage(a.invalidAmount);
      return;
    }
    setBusy(true);
    try {
      await fetch("/api/v1/admin/affiliate-intel/conversions", {
        method: "POST",
        headers: adminMutationHeaders(),
        body: JSON.stringify({ toolId: toolIdValue, amountUsd: n }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function createLink(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/v1/admin/affiliates", {
        method: "POST",
        headers: adminMutationHeaders(),
        body: JSON.stringify({
          toolId,
          label,
          url,
          network: network || undefined,
          priority,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? res.statusText);
      }
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button className="btn btn-primary" disabled={busy} type="button" onClick={() => void syncNow()}>
          {a.syncNow}
        </button>
        <button className="btn btn-ghost" disabled={busy} type="button" onClick={() => void backfill()}>
          {a.rescanAgents}
        </button>
        {message ? <span className="pill">{message}</span> : null}
      </div>

      <div
        style={{
          display: "grid",
          gap: "0.75rem",
          gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
        }}
      >
        {[
          [a.cases, initialItems.length],
          [a.clicks, totals.clicks],
          [a.conversions, totals.conversions],
          [a.salesReward, formatCurrency(totals.sales, locale, locale === "ja" ? "JPY" : "USD")],
          [
            a.overallCvr,
            totals.clicks > 0
              ? formatPercent(totals.conversions / totals.clicks, locale)
              : "—",
          ],
          [
            a.overallEpc,
            totals.clicks > 0
              ? formatCurrency(totals.sales / totals.clicks, locale, locale === "ja" ? "JPY" : "USD")
              : "—",
          ],
        ].map(([k, v]) => (
          <div key={String(k)} className="card-surface" style={{ padding: "0.9rem" }}>
            <div className="muted" style={{ fontSize: 12 }}>
              {k}
            </div>
            <div style={{ fontSize: "1.35rem", fontWeight: 600 }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
        <button
          type="button"
          className={`btn ${filter === "all" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setFilter("all")}
        >
          {dict.common.all}
        </button>
        {STATUSES.map((s) => (
          <StatusChip
            key={s}
            status={s}
            active={filter === s}
            onClick={() => setFilter(s)}
          />
        ))}
      </div>

      {items.length === 0 ? (
        <p className="muted">
          まだ案件がありません。「既存ツールを今すぐ同期」を押すか、ツール公開後に affiliate agent を起動してください。
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "0.85rem" }}>
          {items.map((item) => (
            <li key={item.id} className="card-surface" style={{ padding: "1rem" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "0.75rem",
                  flexWrap: "wrap",
                  alignItems: "start",
                }}
              >
                <div>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                    <strong>
                      {item.name}{" "}
                      <span className="muted" style={{ fontWeight: 400 }}>
                        ({item.slug})
                      </span>
                    </strong>
                    <StatusBadge status={item.status} />
                    <span className="pill">{a.hasAffiliate}: {hasAffiliateLabel(item.hasAffiliate)}</span>
                  </div>
                  <p className="muted" style={{ margin: "0.35rem 0" }}>
                    {a.officialSite}:{" "}
                    <a href={item.homepageUrl} target="_blank" rel="noreferrer">
                      {item.homepageUrl}
                    </a>
                  </p>
                  <p style={{ margin: "0.25rem 0", fontSize: 13 }}>
                    {a.clicks} {item.metrics.clicks} · {a.conversions} {item.metrics.conversions} · {a.salesReward}{" "}
                    {formatCurrency(item.metrics.sales, locale, locale === "ja" ? "JPY" : "USD")} · CVR{" "}
                    {formatPercent(item.metrics.cvr, locale)}{" "}
                    · EPC{" "}
                    {item.metrics.epc == null
                      ? "—"
                      : formatCurrency(item.metrics.epc, locale, locale === "ja" ? "JPY" : "USD")}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                  <select
                    disabled={busy}
                    value={isAffiliateStatus(item.status) ? item.status : "uninvestigated"}
                    onChange={(e) =>
                      void patchCase(item.id, {
                        status: e.target.value,
                        hasAffiliate:
                          e.target.value === "partnered"
                            ? true
                            : e.target.value === "unavailable"
                              ? false
                              : item.hasAffiliate,
                      })
                    }
                    style={selectStyle}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL_JA[s]}
                      </option>
                    ))}
                  </select>
                  <button
                    className="btn btn-ghost"
                    disabled={busy}
                    type="button"
                    onClick={() => void addConversion(item.toolId)}
                  >
                    {a.recordConversion}
                  </button>
                </div>
              </div>

              <div style={{ overflowX: "auto", marginTop: "0.75rem" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr className="muted">
                      <th style={th}>ASP</th>
                      <th style={th}>{dict.common.status}</th>
                      <th style={th}>{a.reward}</th>
                      <th style={th}>{a.cookie}</th>
                      <th style={th}>{a.conversionTerms}</th>
                      <th style={th}>{a.appliedAt}</th>
                      <th style={th}>{a.approvedAt}</th>
                      <th style={th} />
                    </tr>
                  </thead>
                  <tbody>
                    {item.leads.map((lead) => (
                      <tr key={lead.id}>
                        <td style={td}>{lead.aspLabel}</td>
                        <td style={td}>
                          <StatusBadge status={lead.status} />
                        </td>
                        <td style={td}>
                          {lead.rewardText ??
                            (lead.rewardAmount != null ? String(lead.rewardAmount) : "—")}
                        </td>
                        <td style={td}>
                          {lead.cookieDays != null ? `${lead.cookieDays}日` : "—"}
                        </td>
                        <td style={td}>{lead.conversionTerms ?? "—"}</td>
                        <td style={td}>
                          {lead.appliedAt ? lead.appliedAt.slice(0, 10) : "—"}
                        </td>
                        <td style={td}>
                          {lead.approvedAt ? lead.approvedAt.slice(0, 10) : "—"}
                        </td>
                        <td style={td}>
                          <select
                            disabled={busy}
                            value={
                              isAffiliateStatus(lead.status)
                                ? lead.status
                                : "uninvestigated"
                            }
                            onChange={(e) => {
                              const status = e.target.value;
                              void patchLead(lead.id, {
                                status,
                                ...(status === "applying"
                                  ? { appliedAt: new Date().toISOString() }
                                  : {}),
                                ...(status === "partnered"
                                  ? { approvedAt: new Date().toISOString() }
                                  : {}),
                              });
                            }}
                            style={selectStyle}
                          >
                            {STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {STATUS_LABEL_JA[s]}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {item.links.length > 0 ? (
                <p className="muted" style={{ marginTop: "0.75rem", fontSize: 12 }}>
                  公開リンク:{" "}
                  {item.links
                    .map((l) => `${l.label} (${l.network ?? "—"}${l.isHealthy ? "" : ", off"})`)
                    .join(" · ")}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={(e) => void createLink(e)}
        className="card-surface"
        style={{ padding: "1rem", maxWidth: 640 }}
      >
        <h2 style={{ marginTop: 0 }}>{a.addTrackingLink}</h2>
        <label className="muted">
          {a.fieldTool}
          <select
            value={toolId}
            onChange={(e) => setToolId(e.target.value)}
            required
            style={inputStyle}
          >
            {tools.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="muted">
          {a.fieldLabel}
          <input value={label} onChange={(e) => setLabel(e.target.value)} required style={inputStyle} />
        </label>
        <label className="muted">
          {a.fieldUrl}
          <input value={url} onChange={(e) => setUrl(e.target.value)} required style={inputStyle} />
        </label>
        <label className="muted">
          {a.fieldNetwork}
          <input value={network} onChange={(e) => setNetwork(e.target.value)} style={inputStyle} />
        </label>
        <label className="muted">
          {a.fieldPriority}
          <input
            type="number"
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value))}
            style={inputStyle}
          />
        </label>
        <button className="btn btn-primary" disabled={busy} type="submit">
          {a.addGoLink}
        </button>
        {legacyLinks.length > 0 ? (
          <p className="muted" style={{ fontSize: 12 }}>
            既存リンク {legacyLinks.length} 件（クリックは /go 経由で集計）
          </p>
        ) : null}
      </form>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const key = isAffiliateStatus(status) ? status : "uninvestigated";
  const colors = STATUS_COLORS[key];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "0.15rem 0.55rem",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        background: colors.bg,
        color: colors.fg,
        border: `1px solid ${colors.border}`,
      }}
    >
      {STATUS_LABEL_JA[key]}
    </span>
  );
}

function StatusChip({
  status,
  active,
  onClick,
}: {
  status: AffiliateStatus;
  active: boolean;
  onClick: () => void;
}) {
  const colors = STATUS_COLORS[status];
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: `1px solid ${active ? colors.fg : colors.border}`,
        background: active ? colors.bg : "transparent",
        color: colors.fg,
        borderRadius: 999,
        padding: "0.3rem 0.7rem",
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {STATUS_LABEL_JA[status]}
    </button>
  );
}

const inputStyle: CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: 4,
  marginBottom: 10,
  padding: "0.55rem 0.65rem",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--bg)",
};

const selectStyle: CSSProperties = {
  padding: "0.35rem 0.5rem",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--bg)",
  fontSize: 12,
};

const th: CSSProperties = {
  textAlign: "left",
  padding: "0.35rem 0.4rem",
  borderBottom: "1px solid var(--border)",
  fontWeight: 500,
};

const td: CSSProperties = {
  padding: "0.45rem 0.4rem",
  borderBottom: "1px solid var(--border)",
  verticalAlign: "middle",
};
