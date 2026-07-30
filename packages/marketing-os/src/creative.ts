import { repos } from "@ai-base/database";
import { completeJson } from "./llm.js";
import { loadBrandMemory, formatBrandForPrompt } from "./brand-memory.js";
import type { OsPlatform } from "./types.js";

export async function generateCreative(
  workspaceId: string,
  platform: OsPlatform = "instagram",
) {
  const brand = await loadBrandMemory(workspaceId);
  const fallback = {
    caption: `${brand?.brandName ?? "ブランド"}の世界観を一言で伝える投稿。今日の気づきをストーリーテリングで。`,
    hashtags: ["#マーケティング", "#SNS運用", "#ブランド"],
    reelScript:
      "0-3秒: 問題提起フック\n3-15秒: 共感→解決のヒント\n15-30秒: 具体例\nCTA: プロフィールのリンクへ",
    imagePrompt: "洗練されたミニマルなビジュアル、余白多め、高級感",
  };

  const raw = await completeJson<typeof fallback>({
    brand,
    userPrompt: `${platform}向け投稿をワンセット生成してください。API投稿はしません。コピー用です。

${brand ? formatBrandForPrompt(brand) : "ブランド未設定"}

JSON:
{
  "caption": string,
  "hashtags": string[],
  "reelScript": string,
  "imagePrompt": string
}`,
    fallback,
  });

  return repos.marketingOs.createCreative({
    workspaceId,
    platform,
    caption: raw.caption || fallback.caption,
    hashtags: raw.hashtags?.length ? raw.hashtags : fallback.hashtags,
    reelScript: raw.reelScript || fallback.reelScript,
    imagePrompt: raw.imagePrompt || fallback.imagePrompt,
  });
}
