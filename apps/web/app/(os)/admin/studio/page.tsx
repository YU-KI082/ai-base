"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { OS_PLATFORMS, type OsPlatform } from "@ai-base/marketing-os/platforms";
import { OsPending } from "../os-pending";

type Analysis = {
  overall: number;
  scores: Record<string, number>;
  summary: string;
  improvements: string[];
};

type Preset = {
  name: string;
  tags: string[];
  description: string;
  cssFilter: string;
};

type Recipe = {
  cssFilter: string;
  labels: string[];
  mode: string;
  provider: string;
};

type Advice = { title: string; detail: string };

type Variant = {
  purpose: string;
  purposeLabel: string;
  caption: string;
  hashtags: string[];
  bestTime: string;
  reelScript: string;
  storyIdea: string;
  enhanceHint: string;
};

type Predictions = {
  status?: "ready" | "pending";
  saveRatePct?: { min: number; max: number };
  engagementPct?: { min: number; max: number };
  followersDelta?: { min: number; max: number };
  note: string;
};

const SCORE_LABELS: Record<string, string> = {
  brightness: "明るさ",
  composition: "構図",
  color: "色味",
  brandFit: "ブランド一致率",
  productVisibility: "商品の見やすさ",
  background: "背景",
  whitespace: "余白",
  snsAppeal: "SNS映え度",
};

async function fileToCompressedDataUrl(file: File): Promise<{
  dataUrl: string;
  width: number;
  height: number;
  mimeType: string;
}> {
  const bitmap = await createImageBitmap(file);
  const maxEdge = 1280;
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("画像処理に失敗しました");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const mimeType = "image/jpeg";
  const dataUrl = canvas.toDataURL(mimeType, 0.72);
  return { dataUrl, width, height, mimeType };
}

export default function PhotoStudioPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [platform, setPlatform] = useState<OsPlatform>("instagram");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [preset, setPreset] = useState<Preset | null>(null);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [advice, setAdvice] = useState<Advice[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [predictions, setPredictions] = useState<Predictions | null>(null);
  const [compare, setCompare] = useState(55);
  const [copied, setCopied] = useState<string | null>(null);
  const [imageEditReady, setImageEditReady] = useState(false);
  const [visionReady, setVisionReady] = useState(false);
  const [capsLoaded, setCapsLoaded] = useState(false);

  useEffect(() => {
    void fetch("/api/v1/os/capabilities")
      .then((r) => r.json())
      .then((d) => {
        setImageEditReady(Boolean(d.capabilities?.imageEdit?.ready));
        setVisionReady(Boolean(d.capabilities?.vision?.ready));
      })
      .catch(() => {
        setVisionReady(false);
        setImageEditReady(false);
      })
      .finally(() => setCapsLoaded(true));
  }, []);

  const enhancedFilter = recipe?.cssFilter || preset?.cssFilter || "none";

  const onFiles = useCallback(async (files: FileList | File[] | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!visionReady) {
      setError("画像分析AIは準備中です。設定完了後にアップロードできます。");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("画像ファイルを選択してください");
      return;
    }
    setError(null);
    setBusy("upload");
    setVariants([]);
    setPredictions(null);
    setRecipe(null);
    try {
      const compressed = await fileToCompressedDataUrl(file);
      setImageUrl(compressed.dataUrl);
      const res = await fetch("/api/v1/os/photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageDataUrl: compressed.dataUrl,
          fileName: file.name,
          mimeType: compressed.mimeType,
          width: compressed.width,
          height: compressed.height,
          platformTarget: platform,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "アップロードに失敗しました");
      setSessionId(data.session.id);
      setAnalysis(data.analysis);
      setPreset(data.preset);
      setAdvice(data.advice || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "アップロードに失敗しました");
    } finally {
      setBusy(null);
    }
  }, [platform, visionReady]);

  async function enhance() {
    if (!sessionId) return;
    setBusy("enhance");
    setError(null);
    try {
      const res = await fetch(`/api/v1/os/photo/${sessionId}/enhance`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "改善に失敗しました");
      setRecipe(data.recipe);
      setPreset(data.preset);
      setAdvice(data.advice || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "改善に失敗しました");
    } finally {
      setBusy(null);
    }
  }

  async function generatePosts() {
    if (!sessionId) return;
    setBusy("posts");
    setError(null);
    try {
      const res = await fetch(`/api/v1/os/photo/${sessionId}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "投稿生成に失敗しました");
      setVariants(data.variants || []);
      setPredictions(data.predictions || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "投稿生成に失敗しました");
    } finally {
      setBusy(null);
    }
  }

  async function copy(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1400);
  }

  const scoreEntries = useMemo(
    () => (analysis ? Object.entries(analysis.scores) : []),
    [analysis],
  );

  return (
    <main className="os-page os-studio">
      <p className="os-eyebrow">AI Photo Studio</p>
      <h1>写真を上げたら、投稿まで</h1>
      <p className="os-lead">
        画像分析・投稿文生成の拡張枠です。Vision API 接続後に分析が有効になります（画像編集は別途準備中）。
      </p>
      {capsLoaded && !visionReady ? (
        <OsPending title="画像分析AIは準備中">
          Vision API（GEMINI_API_KEY 推奨）設定後に、アップロード分析が有効になります。UIと保存の枠だけ先に用意しています。
        </OsPending>
      ) : null}

      <div className="os-row" style={{ marginBottom: "1rem" }}>
        <select
          className="os-select"
          value={platform}
          onChange={(e) => setPlatform(e.target.value as OsPlatform)}
        >
          {OS_PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {p === "x" ? "X" : p === "youtube" ? "YouTubeサムネ" : p}
            </option>
          ))}
        </select>
        <Link className="os-chip" href="/admin/create">
          テキスト作成へ
        </Link>
      </div>

      <section
        className={`os-dropzone ${dragOver ? "is-over" : ""} ${!visionReady ? "is-disabled" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          if (!visionReady) return;
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (!visionReady) return;
          void onFiles(e.dataTransfer.files);
        }}
        onClick={() => {
          if (!visionReady) return;
          inputRef.current?.click();
        }}
        role="button"
        tabIndex={visionReady ? 0 : -1}
        aria-disabled={!visionReady}
        onKeyDown={(e) => {
          if (!visionReady) return;
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          disabled={!visionReady}
          onChange={(e) => void onFiles(e.target.files)}
        />
        <strong>{visionReady ? "ドラッグ＆ドロップ" : "アップロード準備中"}</strong>
        <span>
          {visionReady
            ? "またはタップして写真を選択（JPEG / PNG）"
            : "Vision API 接続後に有効になります"}
        </span>
        {busy === "upload" ? <em>分析中…</em> : null}
      </section>

      {error ? <p className="os-error">{error}</p> : null}

      {imageUrl ? (
        <>
          {/* eslint-disable @next/next/no-img-element -- data URL preview */}
          <section className="os-studio-compare">
            <div className="os-compare-frame">
              <img
                src={imageUrl}
                alt="改善後"
                className="os-compare-layer"
                style={{ filter: enhancedFilter }}
              />
              <img
                src={imageUrl}
                alt="オリジナル"
                className="os-compare-layer os-compare-before-clip"
                style={{ clipPath: `inset(0 ${100 - compare}% 0 0)` }}
              />
              <div className="os-compare-divider" style={{ left: `${compare}%` }} />
              <div className="os-compare-labels">
                <span>Before</span>
                <span>After</span>
              </div>
            </div>
            <label className="os-compare-slider">
              <span>比較スライダー</span>
              <input
                type="range"
                min={5}
                max={95}
                value={compare}
                onChange={(e) => setCompare(Number(e.target.value))}
              />
            </label>
            <div className="os-row">
              <button
                type="button"
                className="os-btn os-btn-primary"
                disabled={!!busy || !sessionId || !imageEditReady}
                onClick={() => void enhance()}
              >
                {imageEditReady
                  ? busy === "enhance"
                    ? "改善中…"
                    : "ワンクリック改善"
                  : "改善（準備中）"}
              </button>
              <button
                type="button"
                className="os-btn os-btn-ghost"
                disabled={!!busy || !sessionId}
                onClick={() => void generatePosts()}
              >
                {busy === "posts" ? "生成中…" : "投稿を3パターン生成"}
              </button>
            </div>
            <OsPending title="画素レベルの自動改善は準備中">
              明るさ・不要物除去などの実画像編集AIは未接続です。分析・撮影アドバイス・投稿文は利用できます。
            </OsPending>
          </section>
          {/* eslint-enable @next/next/no-img-element */}
        </>
      ) : null}

      {analysis ? (
        <section className="os-card os-studio-analysis">
          <div className="os-score-hero" style={{ marginTop: 0 }}>
            <div className="os-score-number">{analysis.overall}</div>
            <div>画像評価 / 100</div>
          </div>
          <p>{analysis.summary}</p>
          <div className="os-score-grid">
            {scoreEntries.map(([k, v]) => (
              <article key={k} className="os-card">
                <div className="os-score-row">
                  <strong>{SCORE_LABELS[k] || k}</strong>
                  <span>{v}</span>
                </div>
                <div className="os-meter">
                  <i style={{ width: `${v}%` }} />
                </div>
              </article>
            ))}
          </div>
          <h3>改善点</h3>
          <ul>
            {analysis.improvements.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {preset ? (
        <section className="os-card">
          <h2>ブランドプリセット</h2>
          <p>
            <strong>{preset.name}</strong>
          </p>
          <p className="os-muted">{preset.description}</p>
          <div className="os-chip-row">
            {preset.tags.map((t) => (
              <span key={t} className="os-chip" style={{ cursor: "default" }}>
                {t}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {advice.length > 0 ? (
        <section className="os-card">
          <h2>次回の撮影アドバイス</h2>
          <div className="os-action-list">
            {advice.map((a) => (
              <div key={a.title} className="os-action">
                <strong>{a.title}</strong>
                <p>{a.detail}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {variants.length > 0 ? (
        <section className="os-card-list">
          <h2 style={{ margin: "0.5rem 0 0" }}>投稿目的別の3パターン</h2>
          {variants.map((v) => (
            <article key={v.purpose} className="os-card">
              <p className="os-eyebrow">{v.purposeLabel}</p>
              <p className="os-muted">おすすめ投稿時間: {v.bestTime}</p>
              <p className="os-muted">加工ヒント: {v.enhanceHint}</p>
              <h3>キャプション</h3>
              <pre className="os-pre">{v.caption}</pre>
              <button
                type="button"
                className="os-chip"
                onClick={() => void copy(v.caption, `${v.purpose}-c`)}
              >
                {copied === `${v.purpose}-c` ? "コピー済み" : "キャプションをコピー"}
              </button>
              <h3>ハッシュタグ</h3>
              <p>{v.hashtags.join(" ")}</p>
              <button
                type="button"
                className="os-chip"
                onClick={() => void copy(v.hashtags.join(" "), `${v.purpose}-h`)}
              >
                {copied === `${v.purpose}-h` ? "コピー済み" : "タグをコピー"}
              </button>
              <h3>リール構成</h3>
              <pre className="os-pre">{v.reelScript}</pre>
              <h3>ストーリー案</h3>
              <p>{v.storyIdea}</p>
            </article>
          ))}
        </section>
      ) : null}

      {predictions ? (
        <section className="os-card">
          <h2>予想効果</h2>
          {predictions.status === "pending" || !predictions.saveRatePct ? (
            <OsPending title="数値予測は準備中">{predictions.note}</OsPending>
          ) : (
            <>
              <div className="os-dash-grid">
                <div className="os-dash-tile os-card">
                  <span>保存率</span>
                  <strong>
                    {predictions.saveRatePct.min}〜{predictions.saveRatePct.max}%
                  </strong>
                </div>
                <div className="os-dash-tile os-card">
                  <span>エンゲージメント</span>
                  <strong>
                    {predictions.engagementPct!.min}〜{predictions.engagementPct!.max}%
                  </strong>
                </div>
                <div className="os-dash-tile os-card">
                  <span>フォロワー増加</span>
                  <strong>
                    +{predictions.followersDelta!.min}〜{predictions.followersDelta!.max}
                  </strong>
                </div>
              </div>
              <p className="os-muted" style={{ marginTop: "0.75rem" }}>
                {predictions.note}
              </p>
            </>
          )}
        </section>
      ) : null}

      <PhotoHistory
        activeId={sessionId}
        onSelect={(item) => {
          setSessionId(item.id);
          setImageUrl(item.imageDataUrl);
          setAnalysis(item.analysis);
          setPreset(item.preset);
          setAdvice(item.advice);
          setRecipe(item.recipe);
          setVariants(item.variants);
          setPredictions(item.predictions);
          if (item.platformTarget) {
            setPlatform(item.platformTarget as OsPlatform);
          }
        }}
      />
    </main>
  );
}

type HistoryItem = {
  id: string;
  createdAt: string;
  imageDataUrl: string;
  platformTarget?: string | null;
  analysis: Analysis | null;
  preset: Preset | null;
  advice: Advice[];
  recipe: Recipe | null;
  variants: Variant[];
  predictions: Predictions | null;
};

function PhotoHistory({
  activeId,
  onSelect,
}: {
  activeId: string | null;
  onSelect: (item: HistoryItem) => void;
}) {
  const [items, setItems] = useState<
    Array<{
      id: string;
      createdAt: string;
      fileName: string | null;
      platformTarget: string | null;
      analysis: Analysis | null;
      originalUrl?: string;
    }>
  >([]);

  useEffect(() => {
    void fetch("/api/v1/os/photo")
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .catch(() => setItems([]));
  }, [activeId]);

  if (!items.length) return null;

  return (
    <section className="os-card" id="history">
      <h2>画像履歴</h2>
      <p className="os-muted">これまでの Photo Studio セッション</p>
      <div className="os-photo-history">
        {items.map((it) => (
          <button
            key={it.id}
            type="button"
            className={`os-photo-thumb ${activeId === it.id ? "is-active" : ""}`}
            onClick={() =>
              void (async () => {
                const res = await fetch(`/api/v1/os/photo?id=${it.id}`);
                const data = await res.json();
                if (!res.ok || !data.session) return;
                const s = data.session;
                onSelect({
                  id: s.id,
                  createdAt: s.createdAt,
                  imageDataUrl: s.originalUrl || s.enhancedUrl,
                  platformTarget: s.platformTarget,
                  analysis: (s.analysis as Analysis) || null,
                  preset: (s.brandPreset as Preset) || null,
                  advice: (s.shootAdvice as Advice[]) || [],
                  recipe: (s.enhanceRecipe as Recipe) || null,
                  variants: (s.postVariants as Variant[]) || [],
                  predictions: (s.predictions as Predictions) || null,
                });
              })()
            }
          >
            {it.originalUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- data URL thumbs
              <img src={it.originalUrl} alt="" />
            ) : (
              <span>{it.fileName || "画像"}</span>
            )}
            <em>{new Date(it.createdAt).toLocaleString("ja-JP")}</em>
          </button>
        ))}
      </div>
    </section>
  );
}
