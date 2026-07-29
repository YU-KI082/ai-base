import { spawn } from "node:child_process";
import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { VideoRenderPlan, VideoRenderProvider, VideoRenderResult } from "./types.js";

async function whichFfmpeg(): Promise<string | null> {
  const candidates: string[] = [];
  if (process.env.FFMPEG_PATH?.trim()) {
    candidates.push(process.env.FFMPEG_PATH.trim());
  }
  candidates.push("ffmpeg");
  try {
    const mod = await import("ffmpeg-static");
    const staticPath = (mod as { default?: string | null }).default;
    if (staticPath) candidates.push(staticPath);
  } catch {
    // optional
  }

  for (const bin of candidates) {
    const ok = await new Promise<boolean>((resolve) => {
      const child = spawn(bin, ["-version"]);
      child.on("error", () => resolve(false));
      child.on("close", (code) => resolve(code === 0));
    });
    if (ok) return bin;
  }
  return null;
}

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let err = "";
    child.stderr.on("data", (d) => {
      err += String(d);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg failed (${code}): ${err.slice(-800)}`));
    });
  });
}

function escapeDrawtext(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'")
    .replace(/\n/g, " ")
    .slice(0, 120);
}

function publicMediaUrl(filename: string): string | null {
  const base =
    process.env.VIDEO_PUBLIC_BASE_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (!base) return null;
  const prefix = process.env.VIDEO_PUBLIC_PATH_PREFIX?.replace(/\/$/, "") || "/sns-media";
  return `${base}${prefix}/${filename}`;
}

/**
 * FFmpeg-based 9:16 renderer.
 * Produces a real H.264 MP4 with burned-in captions + logo watermark.
 * No third-party footage / uncleared BGM.
 */
export const ffmpegVideoProvider: VideoRenderProvider = {
  name: "ffmpeg",

  async isAvailable() {
    return Boolean(await whichFfmpeg());
  },

  async render(plan: VideoRenderPlan): Promise<VideoRenderResult> {
    const ffmpeg = await whichFfmpeg();
    if (!ffmpeg) {
      throw new Error(
        "FFmpeg not available. Set FFMPEG_PATH or install ffmpeg. Remotion/external_api providers can be selected via VIDEO_RENDER_PROVIDER.",
      );
    }

    const outDir =
      process.env.VIDEO_OUTPUT_DIR?.trim() ||
      path.join(process.cwd(), "apps/web/public/sns-media");
    await mkdir(outDir, { recursive: true });

    const basename = plan.outputBasename || `sns-${plan.id}-${plan.durationSec}s`;
    const filename = `${basename}.mp4`;
    const localPath = path.join(outDir, filename);
    const fps = plan.fps ?? 30;
    const totalFrames = Math.max(1, Math.round(plan.durationSec * fps));

    // Build a filter that concatenates colored scenes with drawtext
    const scenes =
      plan.scenes.length > 0
        ? plan.scenes
        : [
            {
              durationSec: plan.durationSec,
              text: plan.title,
              backgroundColor: "#0B1220",
            },
          ];

    // Normalize scene durations to match plan.durationSec
    const sum = scenes.reduce((a, s) => a + Math.max(0.5, s.durationSec), 0);
    const scale = plan.durationSec / Math.max(sum, 0.1);

    const inputs: string[] = [];
    const filterParts: string[] = [];
    let idx = 0;
    for (const scene of scenes) {
      const dur = Math.max(0.5, scene.durationSec * scale);
      const color = (scene.backgroundColor || "#111827").replace("#", "");
      inputs.push(
        "-f",
        "lavfi",
        "-i",
        `color=c=0x${color}:s=${plan.width}x${plan.height}:d=${dur.toFixed(2)}:r=${fps}`,
      );
      const text = escapeDrawtext(scene.text || plan.title);
      const logo = escapeDrawtext(plan.logoText || "AI BASE");
      filterParts.push(
        `[${idx}:v]drawtext=text='${text}':fontcolor=white:fontsize=56:x=(w-text_w)/2:y=(h-text_h)/2:box=1:boxcolor=black@0.45:boxborderw=24,drawtext=text='${logo}':fontcolor=white@0.85:fontsize=28:x=w-text_w-48:y=h-text_h-72[v${idx}]`,
      );
      idx += 1;
    }

    const concatIn = scenes.map((_, i) => `[v${i}]`).join("");
    const filter = `${filterParts.join(";")};${concatIn}concat=n=${scenes.length}:v=1:a=0[outv]`;

    const args = [
      "-y",
      ...inputs,
      "-filter_complex",
      filter,
      "-map",
      "[outv]",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      "-t",
      String(plan.durationSec),
      localPath,
    ];

    await run(ffmpeg, args);

    // Write a sidecar JSON for operators / learning (no secrets)
    await writeFile(
      path.join(outDir, `${basename}.json`),
      JSON.stringify(
        {
          provider: "ffmpeg",
          planId: plan.id,
          durationSec: plan.durationSec,
          title: plan.title,
          scenes: scenes.map((s) => ({
            durationSec: s.durationSec,
            text: s.text.slice(0, 200),
          })),
          fps,
          totalFrames,
          copyrightSafe: true,
          createdAt: new Date().toISOString(),
        },
        null,
        2,
      ),
      "utf8",
    );

    const st = await stat(localPath);
    return {
      provider: "ffmpeg",
      localPath,
      mediaUrl: publicMediaUrl(filename),
      durationSec: plan.durationSec,
      width: plan.width,
      height: plan.height,
      bytes: st.size,
      metadata: { fps, filename },
    };
  },
};
