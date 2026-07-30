"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { OS_PLATFORMS } from "@ai-base/marketing-os/platforms";

const emptyHandles = Object.fromEntries(OS_PLATFORMS.map((p) => [p, ""])) as Record<
  (typeof OS_PLATFORMS)[number],
  string
>;

export function SetupWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brand, setBrand] = useState({
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
  });
  const [handles, setHandles] = useState(emptyHandles);

  async function finish(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const brandRes = await fetch("/api/v1/os/brand", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(brand),
      });
      const brandJson = await brandRes.json();
      if (!brandRes.ok) throw new Error(brandJson.error || "ブランド保存に失敗");

      const handleRes = await fetch("/api/v1/os/handles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handles: OS_PLATFORMS.map((platform) => ({
            platform,
            username: handles[platform] || "",
          })),
        }),
      });
      const handleJson = await handleRes.json();
      if (!handleRes.ok) throw new Error(handleJson.error || "SNS保存に失敗");

      router.replace("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="os-setup">
      <p className="os-eyebrow">初回セットアップ</p>
      <h1>AI社員にブランドを教えてください</h1>
      <p className="os-lead">API連携は不要です。入力した内容を永続記憶します。</p>
      <p className="os-muted" style={{ marginBottom: "1rem" }}>
        SNS API連携（OAuth）は Coming soon。いまはユーザー名の登録とコピー投稿だけで完結します。
      </p>

      <div className="os-steps">
        <button type="button" className={step === 0 ? "active" : ""} onClick={() => setStep(0)}>
          1. ブランド
        </button>
        <button type="button" className={step === 1 ? "active" : ""} onClick={() => setStep(1)}>
          2. SNS
        </button>
      </div>

      <form onSubmit={(e) => void finish(e)} className="os-setup-form">
        {step === 0 ? (
          <div className="os-fields">
            {(
              [
                ["brandName", "ブランド名", "必須"],
                ["industry", "業種", ""],
                ["targetAudience", "ターゲット層", ""],
                ["concept", "ブランドコンセプト", ""],
                ["worldview", "世界観", ""],
                ["colors", "カラー", ""],
                ["competitors", "競合", ""],
                ["postTone", "投稿トーン", ""],
                ["products", "販売商品", ""],
                ["goals", "目標（フォロワー・売上・認知など）", ""],
              ] as const
            ).map(([key, label, hint]) => (
              <label key={key} className="os-field">
                <span>
                  {label} {hint ? <em>{hint}</em> : null}
                </span>
                <textarea
                  rows={key === "brandName" || key === "industry" ? 1 : 2}
                  required={key === "brandName"}
                  value={brand[key]}
                  onChange={(e) => setBrand((b) => ({ ...b, [key]: e.target.value }))}
                />
              </label>
            ))}
            <button className="os-btn os-btn-primary" type="button" onClick={() => setStep(1)}>
              次へ：SNSユーザー名
            </button>
          </div>
        ) : (
          <div className="os-fields">
            {OS_PLATFORMS.map((p) => (
              <label key={p} className="os-field">
                <span style={{ textTransform: "capitalize" }}>{p}</span>
                <input
                  value={handles[p]}
                  onChange={(e) => setHandles((h) => ({ ...h, [p]: e.target.value }))}
                  placeholder="@username（任意）"
                />
              </label>
            ))}
            <div className="os-row">
              <button className="os-btn os-btn-ghost" type="button" onClick={() => setStep(0)}>
                戻る
              </button>
              <button className="os-btn os-btn-primary" disabled={busy || !brand.brandName} type="submit">
                {busy ? "保存中…" : "AI社員を起動"}
              </button>
            </div>
          </div>
        )}
        {error ? <p className="os-error">{error}</p> : null}
      </form>
    </main>
  );
}
