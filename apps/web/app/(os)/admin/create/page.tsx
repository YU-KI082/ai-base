"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getDictionary } from "@ai-base/i18n";
import { OS_PLATFORMS, type OsPlatform } from "@ai-base/marketing-os/platforms";

type Creative = {
  id: string;
  platform: string;
  caption: string;
  hashtags: string[];
  reelScript: string;
  imagePrompt: string;
  createdAt: string;
};

export default function CreatePage() {
  const t = getDictionary("ja").os;
  const [platform, setPlatform] = useState<OsPlatform>("instagram");
  const [items, setItems] = useState<Creative[]>([]);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/v1/os/creatives");
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "読み込みに失敗しました");
      return;
    }
    setItems(data.items ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function generate() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/v1/os/creatives", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "生成に失敗しました");
      return;
    }
    await load();
  }

  async function copy(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <main className="os-page">
      <p className="os-eyebrow">Create</p>
      <h1>{t.createTitle}</h1>
      <p className="os-lead">{t.createLead}</p>
      <p className="os-muted">{t.noApiPublish}</p>

      <Link href="/admin/studio" className="os-card os-studio-entry">
        <strong>AI Photo Studio</strong>
        <span>写真分析・投稿文の拡張枠（Vision接続後に利用。画像編集・予想効果は準備中）。</span>
      </Link>

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
        <button
          className="os-btn os-btn-primary"
          type="button"
          disabled={busy}
          onClick={() => void generate()}
        >
          {busy ? "…" : t.generatePost}
        </button>
      </div>

      {error ? <p className="os-error">{error}</p> : null}

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
              {copied === `${c.id}-c` ? t.copied : t.copyCaption}
            </button>
            <h3>ハッシュタグ</h3>
            <p>{c.hashtags.join(" ")}</p>
            <button
              className="os-chip"
              type="button"
              onClick={() => void copy(c.hashtags.join(" "), `${c.id}-h`)}
            >
              {copied === `${c.id}-h` ? t.copied : t.copyTags}
            </button>
            <h3>リール台本</h3>
            <pre className="os-pre">{c.reelScript}</pre>
            <button
              className="os-chip"
              type="button"
              onClick={() => void copy(c.reelScript, `${c.id}-r`)}
            >
              {copied === `${c.id}-r` ? t.copied : t.copyTags}
            </button>
            <h3>画像プロンプト</h3>
            <pre className="os-pre">{c.imagePrompt}</pre>
          </article>
        ))}
      </div>
    </main>
  );
}
