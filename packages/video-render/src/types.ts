/**
 * Pluggable vertical video render providers for TikTok / Instagram Reels.
 * Swap providers via VIDEO_RENDER_PROVIDER=ffmpeg|remotion|external_api
 */

export type VideoScene = {
  durationSec: number;
  /** Burned-in caption / hook text */
  text: string;
  /** Optional background color hex */
  backgroundColor?: string;
  /** Optional still image path or URL */
  imagePath?: string | null;
};

export type VideoRenderPlan = {
  id: string;
  aspectRatio: "9:16";
  width: 1080;
  height: 1920;
  durationSec: 15 | 30 | 60;
  fps?: number;
  title: string;
  scenes: VideoScene[];
  /** Soft logo watermark text */
  logoText?: string;
  /** Optional narration script (TTS providers may use) */
  narration?: string;
  /** BGM hint — never use uncleared commercial audio */
  bgmMood?: string;
  locale?: "ja" | "en";
  /** Output basename without extension */
  outputBasename?: string;
};

export type VideoRenderResult = {
  provider: string;
  localPath: string;
  /** Public HTTPS URL when uploaded / served; null if local-only */
  mediaUrl: string | null;
  durationSec: number;
  width: number;
  height: number;
  bytes: number;
  metadata?: Record<string, unknown>;
};

export type VideoRenderProvider = {
  readonly name: string;
  isAvailable(): Promise<boolean>;
  render(plan: VideoRenderPlan): Promise<VideoRenderResult>;
};

export type NarrationProvider = {
  readonly name: string;
  isAvailable(): Promise<boolean>;
  synthesize(input: {
    text: string;
    locale: "ja" | "en";
    outputPath: string;
  }): Promise<{ audioPath: string }>;
};

export type ImageGenProvider = {
  readonly name: string;
  isAvailable(): Promise<boolean>;
  generate(input: {
    prompt: string;
    width: number;
    height: number;
    outputPath: string;
  }): Promise<{ imagePath: string }>;
};
