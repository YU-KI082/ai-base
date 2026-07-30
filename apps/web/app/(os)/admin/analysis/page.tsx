"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Insight = {
  summary: string;
  findings: string[];
  nextActions: Array<{ title: string; why: string; effort: string; deepLink?: string }>;
};

export default function AnalysisPage() {
  const [items, setItems] = useState<Array<{ id: string; summary: string; findings: unknown; nextActions: unknown; createdAt: string }>>([]);
  const [latest, setLatest] = useState<Insight | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/v1/os/analyze");
    const data = await res.json();
    setItems(data.items ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function run() {
    setBusy(true);
    const res = await fetch("/api/v1/os/analyze", { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (data.insight) setLatest(data.insight);
    await load();
  }

  return (
    <main className="os-page">
      <p className="os-eyebrow">AIアカウント分析</p>
      <h1>所見と次の一手</h1>
      <button className="os-btn os-btn-primary" type="button" disabled={busy} onClick={() => void run()}>
        {busy ? "分析中…" : "今すぐ分析"}
      </button>

      {latest ? (
        <section className="os-card">
          <h2>最新</h2>
          <p>{latest.summary}</p>
          <ul>
            {latest.findings.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <h3>次にやること</h3>
          <div className="os-action-list">
            {latest.nextActions.map((a) => (
              <div key={a.title} className="os-action">
                <strong>{a.title}</strong>
                <p>{a.why}</p>
                {a.deepLink ? (
                  <Link href={a.deepLink} className="os-chip">
                    開く
                  </Link>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="os-card-list">
        {items.map((it) => (
          <article key={it.id} className="os-card">
            <p className="os-muted">{new Date(it.createdAt).toLocaleString("ja-JP")}</p>
            <p>{it.summary}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
