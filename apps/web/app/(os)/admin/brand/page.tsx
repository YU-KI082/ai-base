"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const FIELDS: Array<{ key: string; label: string }> = [
  { key: "brandName", label: "ブランド名" },
  { key: "industry", label: "業種" },
  { key: "targetAudience", label: "ターゲット" },
  { key: "concept", label: "コンセプト" },
  { key: "worldview", label: "世界観" },
  { key: "colors", label: "カラー" },
  { key: "competitors", label: "競合" },
  { key: "postTone", label: "投稿トーン" },
  { key: "products", label: "商品・サービス" },
  { key: "goals", label: "目標" },
];

type BrandForm = Record<(typeof FIELDS)[number]["key"], string>;

const emptyBrand = (): BrandForm =>
  Object.fromEntries(FIELDS.map((f) => [f.key, ""])) as BrandForm;

export default function BrandPage() {
  const router = useRouter();
  const [brand, setBrand] = useState<BrandForm | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/v1/os/brand")
      .then((r) => r.json())
      .then((d) => {
        const src = d.brand ?? {};
        const next = emptyBrand();
        for (const f of FIELDS) {
          next[f.key] = typeof src[f.key] === "string" ? src[f.key] : "";
        }
        setBrand(next);
      })
      .catch(() => setError("読み込みに失敗しました"));
  }, []);

  async function save() {
    if (!brand) return;
    if (!brand.brandName?.trim()) {
      setError("ブランド名は必須です");
      return;
    }
    setBusy(true);
    setMsg(null);
    setError(null);
    const res = await fetch("/api/v1/os/brand", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(brand),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "保存に失敗しました");
      return;
    }
    setMsg("ブランド記憶を更新しました");
  }

  async function remove() {
    if (!brand?.brandName?.trim()) {
      setError("削除するブランドがありません");
      return;
    }
    const ok = window.confirm(
      "ブランド記憶を削除しますか？セットアップからやり直しになります。",
    );
    if (!ok) return;
    setBusy(true);
    setMsg(null);
    setError(null);
    const res = await fetch("/api/v1/os/brand", { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "削除に失敗しました");
      return;
    }
    router.replace("/admin/setup");
    router.refresh();
  }

  if (error && !brand) {
    return (
      <main className="os-page">
        <p className="os-error">{error}</p>
      </main>
    );
  }

  if (!brand) return <main className="os-page">読み込み中…</main>;

  return (
    <main className="os-page">
      <p className="os-eyebrow">Brand</p>
      <h1>ブランド記憶</h1>
      <p className="os-lead">毎回説明しなくても、最適な提案ができるようになります。</p>
      <div className="os-fields">
        {FIELDS.map((f) => (
          <label key={f.key} className="os-field">
            <span>{f.label}</span>
            {f.key === "brandName" ? (
              <input
                value={brand[f.key]}
                onChange={(e) => setBrand({ ...brand, [f.key]: e.target.value })}
              />
            ) : (
              <textarea
                rows={2}
                value={brand[f.key]}
                onChange={(e) => setBrand({ ...brand, [f.key]: e.target.value })}
              />
            )}
          </label>
        ))}
      </div>
      <div className="os-row">
        <button className="os-btn os-btn-primary" type="button" disabled={busy} onClick={() => void save()}>
          保存
        </button>
        <button className="os-btn os-btn-ghost" type="button" disabled={busy} onClick={() => void remove()}>
          削除
        </button>
        <Link className="os-btn os-btn-ghost" href="/admin/setup">
          SNSユーザー名
        </Link>
        <Link className="os-btn os-btn-ghost" href="/admin">
          ホームへ
        </Link>
      </div>
      {error ? <p className="os-error">{error}</p> : null}
      {msg ? <p className="os-muted">{msg}</p> : null}
    </main>
  );
}
