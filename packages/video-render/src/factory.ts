import { ffmpegVideoProvider } from "./ffmpeg.js";
import { externalApiVideoProvider, remotionVideoProvider } from "./providers.js";
import type { VideoRenderPlan, VideoRenderProvider } from "./types.js";

export function getVideoRenderProvider(
  name = process.env.VIDEO_RENDER_PROVIDER?.trim() || "ffmpeg",
): VideoRenderProvider {
  switch (name) {
    case "remotion":
      return remotionVideoProvider;
    case "external_api":
      return externalApiVideoProvider;
    case "ffmpeg":
    default:
      return ffmpegVideoProvider;
  }
}

export async function renderVerticalVideo(
  plan: VideoRenderPlan,
): Promise<Awaited<ReturnType<VideoRenderProvider["render"]>>> {
  const preferred = getVideoRenderProvider();
  if (await preferred.isAvailable()) {
    return preferred.render(plan);
  }
  // Fallback order
  for (const p of [
    ffmpegVideoProvider,
    externalApiVideoProvider,
    remotionVideoProvider,
  ]) {
    if (p.name === preferred.name) continue;
    if (await p.isAvailable()) return p.render(plan);
  }
  throw new Error(
    `No video render provider available (tried ${preferred.name}). Install ffmpeg or configure VIDEO_API_URL.`,
  );
}

/** Build a minimal safe render plan from hook/CTA beats. */
export function planFromBeats(input: {
  id: string;
  durationSec: 15 | 30 | 60;
  title: string;
  beats: Array<{
    tStart: number;
    tEnd: number;
    onScreenText: string;
    narration?: string;
  }>;
  logoText?: string;
  locale?: "ja" | "en";
}): VideoRenderPlan {
  const scenes = input.beats.map((b, i) => ({
    durationSec: Math.max(0.5, b.tEnd - b.tStart),
    text: b.onScreenText || b.narration || input.title,
    backgroundColor: i === 0 ? "#0F172A" : i % 2 === 0 ? "#111827" : "#1E293B",
  }));
  return {
    id: input.id,
    aspectRatio: "9:16",
    width: 1080,
    height: 1920,
    durationSec: input.durationSec,
    title: input.title,
    scenes,
    logoText: input.logoText ?? "AI BASE",
    narration: input.beats.map((b) => b.narration || b.onScreenText).join(" "),
    locale: input.locale ?? "ja",
    outputBasename: `auto-${input.id}-${input.durationSec}`,
  };
}
