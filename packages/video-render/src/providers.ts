import type { VideoRenderPlan, VideoRenderProvider, VideoRenderResult } from "./types.js";

/**
 * Remotion provider stub — swap in when @remotion packages are installed.
 * Keeps the same VideoRenderProvider contract for drop-in replacement.
 */
export const remotionVideoProvider: VideoRenderProvider = {
  name: "remotion",

  async isAvailable() {
    return process.env.REMOTION_ENABLED === "1";
  },

  async render(_plan: VideoRenderPlan): Promise<VideoRenderResult> {
    throw new Error(
      "Remotion provider not installed. Set VIDEO_RENDER_PROVIDER=ffmpeg or wire Remotion compositions.",
    );
  },
};

/**
 * External HTTP video API provider (Runway / custom).
 * POST JSON plan to VIDEO_API_URL with VIDEO_API_KEY — never log the key.
 */
export const externalApiVideoProvider: VideoRenderProvider = {
  name: "external_api",

  async isAvailable() {
    return Boolean(
      process.env.VIDEO_API_URL?.trim() && process.env.VIDEO_API_KEY?.trim(),
    );
  },

  async render(plan: VideoRenderPlan): Promise<VideoRenderResult> {
    const url = process.env.VIDEO_API_URL?.trim();
    const key = process.env.VIDEO_API_KEY?.trim();
    if (!url || !key) {
      throw new Error("VIDEO_API_URL / VIDEO_API_KEY not configured");
    }
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        aspectRatio: plan.aspectRatio,
        width: plan.width,
        height: plan.height,
        durationSec: plan.durationSec,
        title: plan.title,
        scenes: plan.scenes,
        logoText: plan.logoText,
        narration: plan.narration,
      }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      mediaUrl?: string;
      localPath?: string;
      bytes?: number;
      error?: string;
    };
    if (!res.ok || !json.mediaUrl) {
      throw new Error(json.error || `External video API failed HTTP ${res.status}`);
    }
    return {
      provider: "external_api",
      localPath: json.localPath || "",
      mediaUrl: json.mediaUrl,
      durationSec: plan.durationSec,
      width: plan.width,
      height: plan.height,
      bytes: json.bytes ?? 0,
    };
  },
};
