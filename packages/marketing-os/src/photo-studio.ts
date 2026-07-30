import { repos } from "@ai-base/database";
import { loadBrandMemory, formatBrandForPrompt } from "./brand-memory.js";
import { completeJson, hasRealLlmCredentials } from "./llm.js";
import { resolveBrandPhotoPreset } from "./photo-studio-engine.js";
import {
  analyzePhotoWithVision,
  enhancePhotoWithProvider,
} from "./photo-studio-vision.js";
import { storeOsImage } from "./media-storage.js";
import {
  OsAiUnavailableError,
  resolveVisionProviderId,
} from "./capabilities.js";
import type { OsPlatform } from "./types.js";
import type {
  PhotoAnalysis,
  PhotoPostVariant,
  PhotoPredictions,
  ShootAdvice,
} from "./photo-studio-types.js";

const MAX_DATA_URL_CHARS = 900_000;

export async function createPhotoSession(input: {
  workspaceId: string;
  imageDataUrl: string;
  fileName?: string;
  mimeType?: string;
  width?: number | null;
  height?: number | null;
  platformTarget?: OsPlatform;
}) {
  if (!input.imageDataUrl.startsWith("data:image/")) {
    throw new Error("画像データが不正です");
  }
  if (input.imageDataUrl.length > MAX_DATA_URL_CHARS) {
    throw new Error(
      "画像が大きすぎます。もう少し圧縮してからアップロードしてください",
    );
  }

  if (!resolveVisionProviderId()) {
    throw new OsAiUnavailableError(
      "画像分析AIは準備中です。OPENAI_API_KEY（Vision対応モデル）設定後に利用できます。",
    );
  }

  const brand = await loadBrandMemory(input.workspaceId);
  const stored = await storeOsImage({
    workspaceId: input.workspaceId,
    dataUrl: input.imageDataUrl,
    fileName: input.fileName,
    contentType: input.mimeType,
  });

  const { analysis, advice, provider } = await analyzePhotoWithVision({
    imageDataUrl: input.imageDataUrl,
    brand,
    width: input.width,
    height: input.height,
  });
  const preset = resolveBrandPhotoPreset(brand);

  const session = await repos.marketingOs.createPhotoSession({
    workspaceId: input.workspaceId,
    originalUrl: stored.url,
    mimeType: stored.contentType || input.mimeType || "image/jpeg",
    width: input.width ?? null,
    height: input.height ?? null,
    fileName: input.fileName ?? null,
    platformTarget: input.platformTarget || "instagram",
    analysis,
    brandPreset: preset,
    shootAdvice: advice,
    status: "analyzed",
    provider,
  });

  return { session, analysis, preset, advice };
}

export async function enhancePhotoSession(workspaceId: string, sessionId: string) {
  const session = await repos.marketingOs.getPhotoSession(sessionId);
  if (!session || session.workspaceId !== workspaceId) {
    throw new Error("セッションが見つかりません");
  }
  const brand = await loadBrandMemory(workspaceId);
  const analysis = session.analysis as PhotoAnalysis;
  // Needs original pixels — if stored as remote URL, fetch; if data URL, use directly.
  let imageDataUrl = session.originalUrl;
  if (imageDataUrl.startsWith("http")) {
    const res = await fetch(imageDataUrl);
    if (!res.ok) throw new Error("保存済み画像の取得に失敗しました");
    const buf = Buffer.from(await res.arrayBuffer());
    const mime = res.headers.get("content-type") || session.mimeType || "image/jpeg";
    imageDataUrl = `data:${mime};base64,${buf.toString("base64")}`;
  }
  const recipe = await enhancePhotoWithProvider({
    imageDataUrl,
    brand,
    analysis,
  });
  const updated = await repos.marketingOs.updatePhotoSession(sessionId, {
    enhanceRecipe: recipe,
    enhancedUrl: recipe.enhancedDataUrl ?? null,
    status: "enhanced",
    provider: recipe.provider,
  });
  return { session: updated, recipe, advice: session.shootAdvice as ShootAdvice[] };
}

export async function generatePhotoPosts(
  workspaceId: string,
  sessionId: string,
  platform?: OsPlatform,
) {
  if (!hasRealLlmCredentials()) {
    throw new OsAiUnavailableError();
  }
  const session = await repos.marketingOs.getPhotoSession(sessionId);
  if (!session || session.workspaceId !== workspaceId) {
    throw new Error("セッションが見つかりません");
  }
  const brand = await loadBrandMemory(workspaceId);
  const analysis = session.analysis as PhotoAnalysis;
  const target = (platform || session.platformTarget || "instagram") as OsPlatform;
  const preset =
    (session.brandPreset as ReturnType<typeof resolveBrandPhotoPreset>) ||
    resolveBrandPhotoPreset(brand);

  const raw = await completeJson<{
    variants: Array<{
      purpose: "save" | "followers" | "sales";
      purposeLabel: string;
      caption: string;
      hashtags: string[];
      bestTime: string;
      reelScript: string;
      storyIdea: string;
      enhanceHint: string;
    }>;
  }>({
    brand,
    userPrompt: `写真分析結果に基づき、${target}向け投稿を3パターン生成してください（保存率重視 / フォロワー獲得 / 売上）。

${brand ? formatBrandForPrompt(brand) : "ブランド未設定"}

プリセット: ${preset.name}（${preset.tags.join(", ")}）
画像評価: ${analysis.overall}/100
要約: ${analysis.summary}
改善点: ${analysis.improvements.join(" / ")}

捏造のリーチ数値は書かない。bestTimeは一般的な推奨帯でよい。

JSON:
{
  "variants": [
    {
      "purpose": "save"|"followers"|"sales",
      "purposeLabel": string,
      "caption": string,
      "hashtags": string[],
      "bestTime": string,
      "reelScript": string,
      "storyIdea": string,
      "enhanceHint": string
    }
  ]
}
variants は必ず3件（各purpose1つ）。`,
  });

  if (!raw.variants || raw.variants.length < 3) {
    throw new Error("投稿パターンの生成に失敗しました。再試行してください。");
  }

  const variants: PhotoPostVariant[] = raw.variants.slice(0, 3).map((v) => ({
    purpose: v.purpose,
    purposeLabel: v.purposeLabel,
    platform: target,
    caption: v.caption,
    hashtags: v.hashtags,
    bestTime: v.bestTime,
    reelScript: v.reelScript,
    storyIdea: v.storyIdea,
    enhanceHint: v.enhanceHint,
  }));

  const predictions: PhotoPredictions = {
    status: "pending",
    note: "保存率・エンゲージメント・フォロワー増の数値予測は、SNSインサイト連携後に表示します（準備中）。",
  };

  const primary = variants[0]!;
  await repos.marketingOs.createCreative({
    workspaceId,
    platform: target,
    caption: primary.caption,
    hashtags: primary.hashtags,
    reelScript: primary.reelScript,
    imagePrompt: `Photo Studio / ${preset.name} / score ${analysis.overall}`,
    imageUrl: session.originalUrl.startsWith("http") ? session.originalUrl : null,
    metadata: {
      source: "photo_studio",
      sessionId,
      variants: variants.map((v) => v.purpose),
    },
  });

  const updated = await repos.marketingOs.updatePhotoSession(sessionId, {
    postVariants: variants,
    predictions,
    platformTarget: target,
    status: "ready",
  });

  return { session: updated, variants, predictions };
}

export async function getPhotoSession(workspaceId: string, sessionId: string) {
  const session = await repos.marketingOs.getPhotoSession(sessionId);
  if (!session || session.workspaceId !== workspaceId) return null;
  return session;
}

export async function listPhotoSessions(workspaceId: string) {
  return repos.marketingOs.listPhotoSessions(workspaceId, 20);
}
