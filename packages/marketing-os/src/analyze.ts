import { repos } from "@ai-base/database";
import { completeJson } from "./llm.js";
import { loadBrandMemory, formatBrandForPrompt } from "./brand-memory.js";
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

  const fallback: ActionableInsight = {
    summary:
      "公開APIなしのため、入力されたブランド記憶とユーザー名から仮説ベースで分析しました。",
    findings: [
      "プロフィール文と世界観の一致をまず確認する",
      "投稿頻度のリズムを週3本以上に整える",
      "競合と差別化できるビジュアルトーンを固定する",
    ],
    nextActions: [
      {
        title: "プロフィール文をブランドコンセプトに合わせて書き直す",
        why: "初見3秒で「誰向けか」が伝わるとフォロー率が上がる",
        effort: "low",
        deepLink: "/admin/brand",
      },
      {
        title: "今日の投稿案を1本生成してコピー投稿する",
        why: "分析より実行が先。仮説検証のサイクルを回す",
        effort: "mid",
        deepLink: "/admin/posts",
      },
      {
        title: "競合3アカウントの保存されやすい投稿をメモする",
        why: "勝ちパターンを自ブランドのトーンに翻訳できる",
        effort: "mid",
        deepLink: "/admin/analysis",
      },
    ],
  };

  const raw = await completeJson<ActionableInsight>({
    brand,
    userPrompt: `SNSアカウントをAI社員として分析してください（公開クローリングは不可・仮説可）。

${brand ? formatBrandForPrompt(brand) : "ブランド未設定"}

登録ハンドル:
${handleLines}

評価観点: プロフィール、投稿頻度、ブランド統一感、デザイン、改善点、競合、強み、弱み。

JSONスキーマ:
{
  "summary": string,
  "findings": string[],
  "nextActions": [{ "title": string, "why": string, "effort": "low"|"mid"|"high", "deepLink"?: string }]
}
nextActions は最低3件。deepLinkは /admin/posts /admin/tasks /admin/brand /admin/score など。`,
    fallback,
  });

  const insight = ActionableInsightSchema.parse({
    ...fallback,
    ...raw,
    findings: raw.findings?.length ? raw.findings : fallback.findings,
    nextActions: raw.nextActions?.length ? raw.nextActions : fallback.nextActions,
  });

  const row = await repos.marketingOs.createAnalysis({
    workspaceId,
    platform: null,
    summary: insight.summary,
    findings: insight.findings,
    nextActions: insight.nextActions,
    detail: { handles, platforms: handles.map((h) => h.platform as OsPlatform) },
  });

  return { insight, row };
}
