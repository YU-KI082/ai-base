import type { BrandMemory } from "./types.js";
import type { PhotoAnalysis, PhotoEnhanceRecipe, PhotoStudioPort } from "./photo-studio-types.js";
import {
  analyzePhotoHeuristic,
  buildEnhanceRecipe,
  resolveBrandPhotoPreset,
} from "./photo-studio-engine.js";

/**
 * Default Photo Studio provider.
 * Swap via registerPhotoStudioPort() when OpenAI / Vision / edit APIs are ready.
 */
export const heuristicPhotoStudioPort: PhotoStudioPort = {
  id: "heuristic",
  async analyze(input) {
    return analyzePhotoHeuristic({
      brand: input.brand,
      width: input.width,
      height: input.height,
      seed: input.imageDataUrl.slice(0, 64),
    });
  },
  async enhance(input) {
    return buildEnhanceRecipe({
      brand: input.brand,
      analysis: input.analysis,
      preset: input.preset,
    });
  },
};

let activePort: PhotoStudioPort = heuristicPhotoStudioPort;

export function getPhotoStudioPort(): PhotoStudioPort {
  return activePort;
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
