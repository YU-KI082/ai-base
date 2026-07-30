import type { BrandMemory, OsPlatform } from "./types.js";

export type PhotoScoreKey =
  | "brightness"
  | "composition"
  | "color"
  | "brandFit"
  | "productVisibility"
  | "background"
  | "whitespace"
  | "snsAppeal";

export type PhotoAnalysis = {
  overall: number;
  scores: Record<PhotoScoreKey, number>;
  summary: string;
  improvements: string[];
};

export type PhotoEnhanceOp =
  | "brightness"
  | "contrast"
  | "colorCorrect"
  | "sharpen"
  | "backgroundCleanup"
  | "objectRemove"
  | "personRemove"
  | "shadowFix"
  | "denoise"
  | "productFocus";

/** CSS-filter recipe until a real image provider is wired. */
export type PhotoEnhanceRecipe = {
  mode: "css-filter" | "image";
  /** CSS filter string applied client-side when mode=css-filter */
  cssFilter: string;
  opsApplied: PhotoEnhanceOp[];
  labels: string[];
  /** When mode=image, provider returns new pixels */
  enhancedDataUrl?: string | null;
  provider: string;
};

export type BrandPhotoPreset = {
  key: string;
  name: string;
  tags: string[];
  description: string;
  cssFilter: string;
};

export type ShootAdvice = {
  title: string;
  detail: string;
};

export type PhotoPostPurpose = "save" | "followers" | "sales";

export type PhotoPostVariant = {
  purpose: PhotoPostPurpose;
  purposeLabel: string;
  platform: OsPlatform | "story" | "youtube_thumb";
  caption: string;
  hashtags: string[];
  bestTime: string;
  reelScript: string;
  storyIdea: string;
  enhanceHint: string;
};

export type PhotoPredictions = {
  saveRatePct: { min: number; max: number };
  engagementPct: { min: number; max: number };
  followersDelta: { min: number; max: number };
  note: string;
};

export type PhotoStudioPort = {
  id: string;
  analyze(input: {
    imageDataUrl: string;
    brand: BrandMemory | null;
    width?: number | null;
    height?: number | null;
  }): Promise<PhotoAnalysis>;
  enhance(input: {
    imageDataUrl: string;
    brand: BrandMemory | null;
    analysis: PhotoAnalysis;
    preset: BrandPhotoPreset;
  }): Promise<PhotoEnhanceRecipe>;
};
