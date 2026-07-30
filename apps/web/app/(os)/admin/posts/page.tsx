"use client";

import { useEffect, useState } from "react";
import { OS_PLATFORMS, type OsPlatform } from "@/lib/os-platforms";

type Creative = {
  id: string;
  platform: string;
  caption: string;
  hashtags: string[];
  reelScript: string;
  imagePrompt: string;
  createdAt: string;
};

export default function PostsPage() {
  const [platform, setPlatform] = useState<OsPlatform>("instagram");
  const [items, setItems] = useState<Creative[]>([]);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/v1/os/creatives");
    const data = await res.json();
    setItems(data.items ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function generate() {
    setBusy(true);
    await fetch("/api/v1/os/creatives", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform }),
    });
    await load();
    setBusy(false);
  }

  async function copy(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <main className="os-page">
      <p className="os-eyebrow">投稿生成</p>
      <h1>コピーして投稿</h1>
      <p className="os-lead">API投稿は行いません。生成→コピーが完了です。</p>

      <div className="os-row">
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value as OsPlatform)}
          className="os-select"
        >
          {OS_PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <button className="os-btn os-btn-primary" type="button" disabled={busy} onClick={() => void generate()}>
          {busy ? "生成中…" : "ワンクリック生成"}
        </button>
      </div>

      <div className="os-card-list">
        {items.map((c) => (
          <article key={c.id} className="os-card">
            <p className="os-muted">
              {c.platform} · {new Date(c.createdAt).toLocaleString("ja-JP")}
            </p>
            <h3>キャプション</h3>
            <pre className="os-pre">{c.caption}</pre>
            <button
              className="os-chip"
              type="button"
              onClick={() => void copy(c.caption, `${c.id}-c`)}
            >
              {copied === `${c.id}-c` ? "コピー済み" : "キャプションをコピー"}
            </button>
            <h3>ハッシュタグ</h3>
            <p>{c.hashtags.join(" ")}</p>
            <button
              className="os-chip"
              type="button"
              onClick={() => void copy(c.hashtags.join(" "), `${c.id}-h`)}
            >
              タグをコピー
            </button>
            <h3>リール台本</h3>
            <pre className="os-pre">{c.reelScript}</pre>
            <h3>画像プロンプト</h3>
            <pre className="os-pre">{c.imagePrompt}</pre>
          </article>
        ))}
      </div>
    </main>
  );
}
