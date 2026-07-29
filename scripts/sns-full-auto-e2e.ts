#!/usr/bin/env node
/**
 * E2E full-auto dry/run:
 * theme → content → FFmpeg MP4 → DB posts → optional publish enqueue
 *
 * Usage:
 *   pnpm --filter @ai-base/sns-auto-ops exec tsx ../../scripts/sns-full-auto-e2e.ts
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { runFullAutoPipeline, saveAutoOpsSettings } from "@ai-base/sns-auto-ops";

async function main() {
  process.env.VIDEO_OUTPUT_DIR =
    process.env.VIDEO_OUTPUT_DIR ||
    path.join(process.cwd(), "apps/web/public/sns-media");
  process.env.VIDEO_PUBLIC_BASE_URL =
    process.env.VIDEO_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://ai-base-beta.vercel.app";
  process.env.VIDEO_RENDER_PROVIDER =
    process.env.VIDEO_RENDER_PROVIDER || "ffmpeg";

  await mkdir(process.env.VIDEO_OUTPUT_DIR, { recursive: true });

  await saveAutoOpsSettings({
    mode: "full_auto",
    emergencyStop: false,
    platformsEnabled: ["tiktok", "instagram", "x", "threads", "note"],
    dailyPostLimit: 5,
  });

  const skipRender = process.argv.includes("--skip-render");
  const result = await runFullAutoPipeline({
    locale: "ja",
    skipRender,
    platforms: ["tiktok", "instagram", "x", "threads", "note"],
  });

  console.log(
    JSON.stringify(
      {
        theme: result.theme,
        postIds: result.postIds,
        publishQueued: result.publishQueued,
        steps: result.steps,
      },
      null,
      2,
    ),
  );

  const renderOk = result.steps.some(
    (s) => s.step.endsWith("_render") && s.ok,
  );
  if (!skipRender && !renderOk) {
    console.error(
      "WARN: video render did not succeed — install ffmpeg or set VIDEO_API_URL",
    );
    process.exitCode = 2;
  } else {
    console.log("E2E pipeline completed");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
