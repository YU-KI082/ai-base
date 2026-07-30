"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Insight = {
  summary: string;
  findings: string[];
  nextActions: Array<{ title: string; why: string; effort: string; deepLink?: string }>;
};

type Sections = {
  profile: string[];
  competitor: string[];
  learning: string[];
};

type ScoreData = {
  overall?: number;
  platforms?: Record<string, { score: number; reason: string }>;
  nextActions?: Array<{ title: string; why: string; deepLink?: string }>;
};

type Improvement = {
  id: string;
  dateKey: string;
  title: string;
  result: string;
  cause: string;
};

export default function AnalysisPage() {
  const [items, setItems] = useState<
    Array<{ id: string; summary: string; createdAt: string }>
  >([]);
  const [latest, setLatest] = useState<Insight | null>(null);
  const [sections, setSections] = useState<Sections | null>(null);
  const [improvements, setImprovements] = useState<Improvement[]>([]);
  const [score, setScore] = useState<ScoreData | null>(null);
  const [busy, setBusy] = useState(false);
  const [scoreBusy, setScoreBusy] = useState(false);

  async function loadAnalysis() {
    const res = await fetch("/api/v1/os/analyze");
    const data = await res.json();
    setItems(data.items ?? []);
    setSections(data.sections ?? null);
    setImprovements(data.improvements ?? []);
    if (data.latest) {
      setLatest({
        summary: data.latest.summary,
        findings: (data.latest.findings as string[]) || [],
        nextActions:
          (data.latest.nextActions as Insight["nextActions"]) || [],
      });
    }
  }

  async function loadScore(force = false) {
    setScoreBusy(true);
    if (force) {
      const res = await fetch("/api/v1/os/score", { method: "POST" });
      setScore(await res.json());
    } else {
      const res = await fetch("/api/v1/os/score");
      const json = await res.json();
      if (json.latest) {
        setScore({
          overall: json.latest.overall,
          platforms: json.latest.platforms,
          nextActions: json.latest.nextActions,
        });
      } else {
        const created = await fetch("/api/v1/os/score", { method: "POST" });
        setScore(await created.json());
      }
    }
    setScoreBusy(false);
  }

  useEffect(() => {
    void loadAnalysis();
    void loadScore();
  }, []);

  async function run() {
    setBusy(true);
    const res = await fetch("/api/v1/os/analyze", { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (data.insight) setLatest(data.insight);
    if (data.sections) setSections(data.sections);
    await loadAnalysis();
  }

  return (
    <main className="os-page">
      <p className="os-eyebrow">Analysis</p>
      <h1>分析と AI SCORE</h1>
      <p className="os-lead">
        プロフィール・競合・成果・スコアを、ひとつの画面で確認できます。
      </p>

      <section id="score" className="os-card" style={{ marginBottom: "1rem" }}>
        <div className="os-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>AI SCORE</h2>
          <button
            className="os-btn os-btn-ghost"
            type="button"
            disabled={scoreBusy}
            onClick={() => void loadScore(true)}
          >
            {scoreBusy ? "算出中…" : "再スコア"}
          </button>
        </div>
        {score?.overall != null ? (
          <div className="os-score-hero" style={{ marginTop: "0.75rem" }}>
            <div className="os-score-number">{score.overall}</div>
            <div>総合 AI SCORE</div>
          </div>
        ) : null}
        <div className="os-score-grid">
          {score?.platforms
            ? Object.entries(score.platforms).map(([k, v]) => (
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
      </section>

      <button className="os-btn os-btn-primary" type="button" disabled={busy} onClick={() => void run()}>
        {busy ? "分析中…" : "今すぐ分析"}
      </button>

      {sections ? (
        <div className="os-analysis-sections">
          <section className="os-card" id="profile">
            <h2>プロフィール分析</h2>
            <ul>
              {sections.profile.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <Link href="/admin/brand" className="os-chip">
              ブランドを整える
            </Link>
          </section>
          <section className="os-card" id="competitor">
            <h2>競合分析</h2>
            <ul>
              {sections.competitor.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </section>
          <section className="os-card" id="results">
            <h2>成果レポート / AI学習</h2>
            <ul>
              {sections.learning.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <p className="os-muted">学習ログ {improvements.length} 件</p>
          </section>
        </div>
      ) : null}

      {latest ? (
        <section className="os-card">
          <h2>最新の所見</h2>
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
        <h2 style={{ margin: "0.5rem 0 0" }}>分析履歴</h2>
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
