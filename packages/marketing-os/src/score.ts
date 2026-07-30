import { repos } from "@ai-base/database";
import { completeJson } from "./llm.js";
import { loadBrandMemory, formatBrandForPrompt } from "./brand-memory.js";
import { OS_PLATFORMS, type NextAction } from "./types.js";

export type ScoreResult = {
  overall: number;
  platforms: Record<string, { score: number; reason: string }>;
  reasons: string[];
  nextActions: NextAction[];
};

export async function generateAiScore(workspaceId: string) {
  const brand = await loadBrandMemory(workspaceId);
  const handles = await repos.snsHandles.list(workspaceId);

  const fallbackPlatforms: ScoreResult["platforms"] = {};
  for (const p of OS_PLATFORMS) {
    const has = handles.some((h) => h.platform === p);
    fallbackPlatforms[p] = {
      score: has ? 62 : 40,
      reason: has
        ? "アカウントは登録済み。世界観の一貫性と投稿リズムで加点余地あり"
        : "ユーザー未登録。まずハンドルを登録し現状把握から",
    };
  }
  const avg = Math.round(
    Object.values(fallbackPlatforms).reduce((s, x) => s + x.score, 0) /
      OS_PLATFORMS.length,
  );
  const fallback: ScoreResult = {
    overall: avg,
    platforms: fallbackPlatforms,
    reasons: [
      "ブランド記憶の密度が高いほどスコア精度が上がる",
      "未連携プラットフォームは低めに評価",
    ],
    nextActions: [
      {
        title: "最も低い媒体のプロフィールを今日中に整える",
        why: "ボトルネック媒体を上げると総合SCOREが伸びやすい",
        effort: "low",
        deepLink: "/admin/brand",
      },
      {
        title: "SCOREが低い媒体向けに投稿を1本生成する",
        why: "改善は投稿実験で検証する",
        effort: "mid",
        deepLink: "/admin/posts",
      },
    ],
  };

  const raw = await completeJson<ScoreResult>({
    brand,
    userPrompt: `各SNSを100点満点で評価し、総合AI SCOREも出してください。

${brand ? formatBrandForPrompt(brand) : "ブランド未設定"}
ハンドル: ${handles.map((h) => `${h.platform}:@${h.username}`).join(", ") || "なし"}

媒体: ${OS_PLATFORMS.join(", ")}

JSON:
{
  "overall": number,
  "platforms": { "<platform>": { "score": number, "reason": string } },
  "reasons": string[],
  "nextActions": [{ "title": string, "why": string, "effort": "low"|"mid"|"high", "deepLink"?: string }]
}
点数だけでなく改善理由と nextActions（最低2）必須。`,
    fallback,
  });

  const platforms = { ...fallback.platforms, ...(raw.platforms ?? {}) };
  for (const p of OS_PLATFORMS) {
    if (!platforms[p]) platforms[p] = fallback.platforms[p]!;
    platforms[p]!.score = Math.max(
      0,
      Math.min(100, Math.round(Number(platforms[p]!.score) || 0)),
    );
  }
  const overall = Math.max(
    0,
    Math.min(100, Math.round(Number(raw.overall) || fallback.overall)),
  );
  const nextActions =
    raw.nextActions?.length ? raw.nextActions : fallback.nextActions;

  const row = await repos.marketingOs.createScore({
    workspaceId,
    overall,
    platforms,
    reasons: raw.reasons?.length ? raw.reasons : fallback.reasons,
    nextActions,
  });

  return { overall, platforms, reasons: row.reasons, nextActions, row };
}
