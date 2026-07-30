import { repos } from "@ai-base/database";
import { completeJson } from "./llm.js";
import { loadBrandMemory, formatBrandForPrompt } from "./brand-memory.js";
import { buildBrandCreative } from "./brand-engine.js";
import type { OsPlatform } from "./types.js";

export async function generateCreative(
  workspaceId: string,
  platform: OsPlatform = "instagram",
) {
  const brand = await loadBrandMemory(workspaceId);
  const engine = buildBrandCreative(brand, platform);

  const raw = await completeJson<typeof engine>({
    brand,
    userPrompt: `${platform}向け投稿をワンセット生成してください。API投稿はしません。コピー用です。ブランド名「${brand?.brandName ?? ""}」をキャプションに自然に含めること。

${brand ? formatBrandForPrompt(brand) : "ブランド未設定"}

JSON:
{
  "caption": string,
  "hashtags": string[],
  "reelScript": string,
  "imagePrompt": string
}`,
  });

  return repos.marketingOs.createCreative({
    workspaceId,
    platform,
    caption: raw?.caption || engine.caption,
    hashtags: raw?.hashtags?.length ? raw.hashtags : engine.hashtags,
    reelScript: raw?.reelScript || engine.reelScript,
    imagePrompt: raw?.imagePrompt || engine.imagePrompt,
    metadata: { source: raw ? "llm" : "brand_engine" },
  });
}
