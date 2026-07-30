"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function DashPage() {
  const [score, setScore] = useState<number | null>(null);
  const [tasks, setTasks] = useState(0);
  const [done, setDone] = useState(0);
  const [creatives, setCreatives] = useState(0);
  const [analyses, setAnalyses] = useState(0);
  const [brandName, setBrandName] = useState("");

  useEffect(() => {
    void (async () => {
      const [b, s, t, c, a] = await Promise.all([
        fetch("/api/v1/os/brand").then((r) => r.json()),
        fetch("/api/v1/os/score").then((r) => r.json()),
        fetch("/api/v1/os/tasks").then((r) => r.json()),
        fetch("/api/v1/os/creatives").then((r) => r.json()),
        fetch("/api/v1/os/analyze").then((r) => r.json()),
      ]);
      setBrandName(b.brand?.brandName ?? "");
      setScore(s.latest?.overall ?? null);
      const items = t.taskSet?.items ?? [];
      setTasks(items.length);
      setDone(items.filter((x: { doneAt: string | null }) => x.doneAt).length);
      setCreatives((c.items ?? []).length);
      setAnalyses((a.items ?? []).length);
    })();
  }, []);

  return (
    <main className="os-page">
      <p className="os-eyebrow">概要</p>
      <h1>{brandName || "ダッシュボード"}</h1>
      <p className="os-lead">ホームはAI社員です。ここは状況の俯瞰用です。</p>

      <div className="os-dash-grid">
        <Link href="/admin/score" className="os-card os-dash-tile">
          <span>AI SCORE</span>
          <strong>{score ?? "—"}</strong>
        </Link>
        <Link href="/admin/tasks" className="os-card os-dash-tile">
          <span>今日のタスク</span>
          <strong>
            {done}/{tasks}
          </strong>
        </Link>
        <Link href="/admin/posts" className="os-card os-dash-tile">
          <span>生成済み投稿</span>
          <strong>{creatives}</strong>
        </Link>
        <Link href="/admin/analysis" className="os-card os-dash-tile">
          <span>分析履歴</span>
          <strong>{analyses}</strong>
        </Link>
        <Link href="/admin/brand" className="os-card os-dash-tile">
          <span>ブランド状況</span>
          <strong>{brandName ? "記憶済み" : "未設定"}</strong>
        </Link>
        <Link href="/admin" className="os-card os-dash-tile">
          <span>改善点</span>
          <strong>AI社員へ</strong>
        </Link>
      </div>
    </main>
  );
}
