"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CompanyOpsSettings, SiteBrandPack } from "@ai-base/company-ops";
import { adminMutationHeaders } from "@/lib/admin-fetch";

export function CompanyDashboardClient({
  locale,
  settings,
  revenue,
  brands,
}: {
  locale: "ja" | "en";
  settings: CompanyOpsSettings;
  revenue: {
    today: { revenue: number; conversions: number; profit: number; clicks: number };
    yesterday: { revenue: number; conversions: number; profit: number; clicks: number };
    month: { revenue: number; conversions: number; profit: number; clicks: number };
    total: { revenue: number; conversions: number; profit: number };
    byAsp: Array<{ network: string; revenue: number; conversions: number }>;
    bySns: Array<{
      platform: string;
      plays: number;
      clicks: number;
      conversions: number;
      revenue: number;
    }>;
    roi: number;
  };
  brands: SiteBrandPack[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const ja = locale === "ja";

  async function post(action: string, extra?: Record<string, unknown>) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/v1/admin/company", {
        method: "POST",
        headers: adminMutationHeaders(),
        body: JSON.stringify({ action, ...extra }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(body.error ?? "error");
        return;
      }
      setMsg(ja ? "完了" : "Done");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const cards = [
    [ja ? "今日の売上" : "Today rev", revenue.today.revenue.toFixed(2)],
    [ja ? "昨日" : "Yesterday", revenue.yesterday.revenue.toFixed(2)],
    [ja ? "今月" : "Month", revenue.month.revenue.toFixed(2)],
    [ja ? "総収益" : "Total", revenue.total.revenue.toFixed(2)],
    [ja ? "今日CV" : "CV today", revenue.today.conversions],
    [ja ? "今月利益" : "Month profit", revenue.month.profit.toFixed(2)],
    ["ROI", revenue.roi.toFixed(2)],
  ];

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      {msg ? <p className="muted">{msg}</p> : null}

      <section className="card-surface" style={{ padding: "1.15rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>
              {ja ? "完全自動AI会社" : "Fully automatic AI company"}
            </h2>
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              mode={settings.mode} · brand={settings.activeSiteBrandKey} · emergency=
              {String(settings.emergencyStop)}
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
            <button className="btn btn-primary" disabled={busy} type="button" onClick={() => void post("run_tick")}>
              {ja ? "会社1日サイクル実行" : "Run company day"}
            </button>
            <button className="btn btn-danger" disabled={busy} type="button" onClick={() => void post("emergency_stop")}>
              {ja ? "緊急停止" : "Emergency stop"}
            </button>
            <button className="btn btn-ghost" disabled={busy} type="button" onClick={() => void post("resume")}>
              {ja ? "再開" : "Resume"}
            </button>
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
            gap: "0.75rem",
            marginTop: "1rem",
          }}
        >
          {cards.map(([label, value]) => (
            <div key={String(label)}>
              <div className="muted" style={{ fontSize: 12 }}>
                {label}
              </div>
              <div style={{ fontSize: "1.2rem", fontWeight: 700 }}>{value}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="card-surface" style={{ padding: "1.15rem" }}>
        <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>
          {ja ? "SNS別" : "By SNS"}
        </h2>
        {revenue.bySns.length === 0 ? (
          <p className="muted">{ja ? "まだデータがありません" : "No data yet"}</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
            {revenue.bySns.map((s) => (
              <li key={s.platform}>
                {s.platform}: plays {s.plays} · clicks {s.clicks} · CV {s.conversions} · $
                {s.revenue.toFixed(0)}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card-surface" style={{ padding: "1.15rem" }}>
        <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>
          {ja ? "ASP別" : "By ASP"}
        </h2>
        {revenue.byAsp.length === 0 ? (
          <p className="muted">{ja ? "案件データなし" : "No ASP data"}</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
            {revenue.byAsp.map((a) => (
              <li key={a.network}>
                {a.network}: CV {a.conversions} · ${a.revenue.toFixed(0)}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card-surface" style={{ padding: "1.15rem" }}>
        <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>
          {ja ? "マルチサイト複製" : "Multi-site clone"}
        </h2>
        <p className="muted" style={{ fontSize: 13 }}>
          {ja
            ? "ブランドパックを切り替えるだけで垂直サイトを起動（コード分岐なし）"
            : "Activate a brand pack without forking code"}
        </p>
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          {brands.map((b) => (
            <button
              key={b.key}
              className={`btn ${settings.activeSiteBrandKey === b.key ? "btn-primary" : "btn-ghost"}`}
              disabled={busy}
              type="button"
              onClick={() => void post("activate_brand", { brandKey: b.key })}
            >
              {b.name}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
