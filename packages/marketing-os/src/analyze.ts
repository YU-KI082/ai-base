import { repos } from "@ai-base/database";
import { completeJson } from "./llm.js";
import { loadBrandMemory, formatBrandForPrompt } from "./brand-memory.js";
import { buildBrandAnalysis } from "./brand-engine.js";
import {
  ActionableInsightSchema,
  type ActionableInsight,
  type OsPlatform,
} from "./types.js";

export async function analyzeAccounts(workspaceId: string): Promise<{
  insight: ActionableInsight;
  row: Awaited<ReturnType<typeof repos.marketingOs.createAnalysis>>;
}> {
  const brand = await loadBrandMemory(workspaceId);
  const handles = await repos.snsHandles.list(workspaceId);
  const handleLines =
    handles.length > 0
      ? handles.map((h) => `- ${h.platform}: @${h.username}`).join("\n")
      : "（未登録）";

  const engine = buildBrandAnalysis(brand, handles);

  const raw = await completeJson<ActionableInsight>({
    brand,
    userPrompt: `SNSアカウントをAI社員として分析してください（公開クローリングは不可・仮説可）。入力ブランドを必ず具体名で引用すること。

${brand ? formatBrandForPrompt(brand) : "ブランド未設定"}

登録ハンドル:
${handleLines}

評価観点: プロフィール、投稿頻度、ブランド統一感、デザイン、改善点、競合、強み、弱み。

JSON:
{
  "summary": string,
  "findings": string[],
  "nextActions": [{ "title": string, "why": string, "effort": "low"|"mid"|"high", "deepLink"?: string }]
}
nextActions は最低3件。`,
  });

  const insight = ActionableInsightSchema.parse({
    summary: raw?.summary || engine.summary,
    findings: raw?.findings?.length ? raw.findings : engine.findings,
    nextActions: raw?.nextActions?.length ? raw.nextActions : engine.nextActions,
  });

  const row = await repos.marketingOs.createAnalysis({
    workspaceId,
    platform: null,
    summary: insight.summary,
    findings: insight.findings,
    nextActions: insight.nextActions,
    detail: {
      handles,
      platforms: handles.map((h) => h.platform as OsPlatform),
      source: raw ? "llm" : "brand_engine",
    },
  });

  return { insight, row };
}
