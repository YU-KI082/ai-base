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

  const raw = await completeJson<ScoreResult>({
    brand,
    userPrompt: `各SNSを100点満点で評価し、総合AI SCOREも出してください。入力ブランド名を理由に必ず含めること。公開クローリング不可・登録情報とブランド記憶のみで評価。

${brand ? formatBrandForPrompt(brand) : "ブランド未設定"}
ハンドル: ${handles.map((h) => `${h.platform}:@${h.username}`).join(", ") || "なし"}

媒体: ${OS_PLATFORMS.join(", ")}

JSON:
{
  "overall": number,
  "platforms": { "<platform>": { "score": number, "reason": string } },
  "reasons": string[],
  "nextActions": [{ "title": string, "why": string, "effort": "low"|"mid"|"high", "deepLink"?: string }]
}`,
  });

  const platforms: ScoreResult["platforms"] = {};
  for (const p of OS_PLATFORMS) {
    const row = raw.platforms?.[p];
    platforms[p] = {
      score: Math.max(0, Math.min(100, Math.round(Number(row?.score) || 0))),
      reason: row?.reason?.trim() || "評価理由が不足しています",
    };
  }
  const overall = Math.max(
    0,
    Math.min(100, Math.round(Number(raw.overall) || 0)),
  );
  const nextActions = raw.nextActions?.length ? raw.nextActions : [];
  const reasons = raw.reasons?.length ? raw.reasons : [];

  const row = await repos.marketingOs.createScore({
    workspaceId,
    overall,
    platforms,
    reasons,
    nextActions,
  });

  return { overall, platforms, reasons, nextActions, row };
}
