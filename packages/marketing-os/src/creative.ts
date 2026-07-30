import { repos } from "@ai-base/database";
import { completeJson } from "./llm.js";
import { loadBrandMemory, formatBrandForPrompt } from "./brand-memory.js";
import type { OsPlatform } from "./types.js";

type CreativeDraft = {
  caption: string;
  hashtags: string[];
  reelScript: string;
  imagePrompt: string;
};

export async function generateCreative(
  workspaceId: string,
  platform: OsPlatform = "instagram",
) {
  const brand = await loadBrandMemory(workspaceId);

  const raw = await completeJson<CreativeDraft>({
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

  if (
    !raw.caption?.trim() ||
    !Array.isArray(raw.hashtags) ||
    !raw.reelScript?.trim()
  ) {
    throw new Error("AI投稿生成の結果が不完全です。再試行してください。");
  }

  return repos.marketingOs.createCreative({
    workspaceId,
    platform,
    caption: raw.caption,
    hashtags: raw.hashtags,
    reelScript: raw.reelScript,
    imagePrompt: raw.imagePrompt || "",
    metadata: { source: "llm" },
  });
}
