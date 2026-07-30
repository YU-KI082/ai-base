import { repos } from "@ai-base/database";
import { loadBrandMemory } from "./brand-memory.js";
import {
  buildPhotoPostVariants,
  buildPhotoPredictions,
  buildShootAdvice,
  resolveBrandPhotoPreset,
} from "./photo-studio-engine.js";
import { runPhotoAnalyze, runPhotoEnhance } from "./photo-studio-port.js";
import type { OsPlatform } from "./types.js";
import type { PhotoAnalysis } from "./photo-studio-types.js";

const MAX_DATA_URL_CHARS = 900_000; // ~0.9MB text safety for Neon

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
    throw new Error("画像が大きすぎます。もう少し圧縮してからアップロードしてください");
  }

  const brand = await loadBrandMemory(input.workspaceId);
  const analysis = await runPhotoAnalyze(brand, input.imageDataUrl, {
    width: input.width,
    height: input.height,
  });
  const preset = resolveBrandPhotoPreset(brand);
  const advice = buildShootAdvice(brand, analysis);

  const session = await repos.marketingOs.createPhotoSession({
    workspaceId: input.workspaceId,
    originalUrl: input.imageDataUrl,
    mimeType: input.mimeType || "image/jpeg",
    width: input.width ?? null,
    height: input.height ?? null,
    fileName: input.fileName ?? null,
    platformTarget: input.platformTarget || "instagram",
    analysis,
    brandPreset: preset,
    shootAdvice: advice,
    status: "analyzed",
    provider: "heuristic",
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
  const { recipe, preset } = await runPhotoEnhance(
    brand,
    session.originalUrl,
    analysis,
  );
  const advice = buildShootAdvice(brand, analysis);
  const updated = await repos.marketingOs.updatePhotoSession(sessionId, {
    enhanceRecipe: recipe,
    brandPreset: preset,
    shootAdvice: advice,
    enhancedUrl: recipe.enhancedDataUrl ?? null,
    status: "enhanced",
    provider: recipe.provider,
  });
  return { session: updated, recipe, preset, advice };
}

export async function generatePhotoPosts(
  workspaceId: string,
  sessionId: string,
  platform?: OsPlatform,
) {
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
  const variants = buildPhotoPostVariants({
    brand,
    platform: target,
    analysis,
    preset,
  });
  const predictions = buildPhotoPredictions({
    analysis,
    enhanced: Boolean(
      session.enhancedUrl ||
        (session.enhanceRecipe &&
          typeof session.enhanceRecipe === "object" &&
          "cssFilter" in (session.enhanceRecipe as object)),
    ),
  });

  // Also persist as GeneratedCreative for Create history (first variant)
  const primary = variants[0]!;
  await repos.marketingOs.createCreative({
    workspaceId,
    platform: target,
    caption: primary.caption,
    hashtags: primary.hashtags,
    reelScript: primary.reelScript,
    imagePrompt: `Photo Studio / ${preset.name} / score ${analysis.overall}`,
    imageUrl: null,
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
