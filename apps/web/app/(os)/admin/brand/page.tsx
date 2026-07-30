"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Brand = Record<string, string>;

export default function BrandPage() {
  const [brand, setBrand] = useState<Brand | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/v1/os/brand")
      .then((r) => r.json())
      .then((d) => setBrand(d.brand ?? {
        brandName: "",
        industry: "",
        targetAudience: "",
        concept: "",
        worldview: "",
        colors: "",
        competitors: "",
        postTone: "",
        products: "",
        goals: "",
      }));
  }, []);

  async function save() {
    if (!brand) return;
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/v1/os/brand", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(brand),
    });
    setBusy(false);
    setMsg(res.ok ? "ブランド記憶を更新しました" : "保存に失敗しました");
  }

  if (!brand) return <main className="os-page">読み込み中…</main>;

  return (
    <main className="os-page">
      <p className="os-eyebrow">AIブランド記憶</p>
      <h1>永続メモリ</h1>
      <p className="os-lead">毎回説明しなくても、最適な提案ができるようになります。</p>
      <div className="os-fields">
        {Object.entries(brand).map(([key, value]) => (
          <label key={key} className="os-field">
            <span>{key}</span>
            <textarea
              rows={2}
              value={value}
              onChange={(e) => setBrand({ ...brand, [key]: e.target.value })}
            />
          </label>
        ))}
      </div>
      <div className="os-row">
        <button className="os-btn os-btn-primary" type="button" disabled={busy} onClick={() => void save()}>
          保存
        </button>
        <Link className="os-btn os-btn-ghost" href="/admin">
          AI社員へ
        </Link>
      </div>
      {msg ? <p className="os-muted">{msg}</p> : null}
    </main>
  );
}
