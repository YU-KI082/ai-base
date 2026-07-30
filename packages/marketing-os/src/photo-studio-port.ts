import type { BrandMemory } from "./types.js";
import type { PhotoAnalysis, PhotoEnhanceRecipe, PhotoStudioPort } from "./photo-studio-types.js";
import {
  getActivePhotoStudioPort,
  visionPhotoStudioPort,
} from "./photo-studio-vision.js";
import { resolveBrandPhotoPreset } from "./photo-studio-engine.js";
import { OsAiUnavailableError } from "./capabilities.js";

let activePort: PhotoStudioPort | null = getActivePhotoStudioPort();

export function getPhotoStudioPort(): PhotoStudioPort {
  const port = activePort ?? getActivePhotoStudioPort();
  if (!port) {
    throw new OsAiUnavailableError("画像分析AIは準備中です。");
  }
  return port;
}

export function registerPhotoStudioPort(port: PhotoStudioPort): void {
  activePort = port;
}

export async function runPhotoAnalyze(
  brand: BrandMemory | null,
  imageDataUrl: string,
  meta?: { width?: number | null; height?: number | null },
): Promise<PhotoAnalysis> {
  return getPhotoStudioPort().analyze({
    imageDataUrl,
    brand,
    width: meta?.width,
    height: meta?.height,
  });
}

export async function runPhotoEnhance(
  brand: BrandMemory | null,
  imageDataUrl: string,
  analysis: PhotoAnalysis,
): Promise<{ recipe: PhotoEnhanceRecipe; preset: ReturnType<typeof resolveBrandPhotoPreset> }> {
  const preset = resolveBrandPhotoPreset(brand);
  const recipe = await getPhotoStudioPort().enhance({
    imageDataUrl,
    brand,
    analysis,
    preset,
  });
  return { recipe, preset };
}

export { visionPhotoStudioPort };
