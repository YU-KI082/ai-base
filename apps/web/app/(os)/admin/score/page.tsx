"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function ScorePage() {
  const [data, setData] = useState<{
    overall?: number;
    platforms?: Record<string, { score: number; reason: string }>;
    reasons?: string[];
    nextActions?: Array<{ title: string; why: string; deepLink?: string }>;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh(force = false) {
    setBusy(true);
    if (force) {
      const res = await fetch("/api/v1/os/score", { method: "POST" });
      const json = await res.json();
      setData(json);
    } else {
      const res = await fetch("/api/v1/os/score");
      const json = await res.json();
      if (json.latest) {
        setData({
          overall: json.latest.overall,
          platforms: json.latest.platforms,
          reasons: json.latest.reasons,
          nextActions: json.latest.nextActions,
        });
      } else {
        const created = await fetch("/api/v1/os/score", { method: "POST" });
        setData(await created.json());
      }
    }
    setBusy(false);
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <main className="os-page">
      <p className="os-eyebrow">AI SCORE</p>
      <h1>媒体別 × 総合</h1>
      <button className="os-btn os-btn-primary" type="button" disabled={busy} onClick={() => void refresh(true)}>
        {busy ? "算出中…" : "再スコア"}
      </button>

      {data?.overall != null ? (
        <div className="os-score-hero">
          <div className="os-score-number">{data.overall}</div>
          <div>総合 AI SCORE</div>
        </div>
      ) : null}

      <div className="os-score-grid">
        {data?.platforms
          ? Object.entries(data.platforms).map(([k, v]) => (
              <article key={k} className="os-card">
                <div className="os-score-row">
                  <strong style={{ textTransform: "capitalize" }}>{k}</strong>
                  <span>{v.score}</span>
                </div>
                <p className="os-muted">{v.reason}</p>
              </article>
            ))
          : null}
      </div>

      {data?.nextActions?.length ? (
        <section className="os-card">
          <h2>次の一手</h2>
          {data.nextActions.map((a) => (
            <div key={a.title} className="os-action">
              <strong>{a.title}</strong>
              <p>{a.why}</p>
              {a.deepLink ? (
                <Link href={a.deepLink} className="os-chip">
                  進む
                </Link>
              ) : null}
            </div>
          ))}
        </section>
      ) : null}
    </main>
  );
}
