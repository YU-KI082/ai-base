import { prisma, repos } from "@ai-base/database";
import { completeText, hasRealLlmCredentials } from "./llm.js";
import { loadBrandMemory } from "./brand-memory.js";
import { ensureTodayTasks } from "./tasks.js";
import { generateAiScore, type ScoreResult } from "./score.js";
import {
  buildEmployeeDailyBrief,
  type ImprovementRow,
} from "./daily-brief-engine.js";
import {
  formatImprovementsForPrompt,
  tokyoDateKey,
} from "./persona.js";
import { OsAiUnavailableError } from "./capabilities.js";

const BRIEF_VERSION = "employee-v3";

function asPlanPayload(payload: unknown): { version?: string } {
  if (payload && typeof payload === "object") return payload as { version?: string };
  return {};
}

async function loadOwnerName(workspaceId: string): Promise<string | null> {
  // Neon HTTP: avoid include — fetch owner in a second query.
  const ws = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { ownerUserId: true },
  });
  if (!ws?.ownerUserId) return null;
  const owner = await prisma.user.findUnique({
    where: { id: ws.ownerUserId },
    select: { name: true },
  });
  return owner?.name ?? null;
}

async function loadImprovementRows(workspaceId: string): Promise<ImprovementRow[]> {
  const rows = await repos.marketingOs.listImprovements(workspaceId, 12);
  return rows.map((r) => ({
    dateKey: r.dateKey,
    title: r.title,
    cause: r.cause,
    action: r.action,
    result: r.result,
    platform: r.platform,
  }));
}

export async function ensureDailyBrief(workspaceId: string) {
  const dateKey = tokyoDateKey();
  const existing = await repos.marketingOs.findBrief(workspaceId, dateKey);
  const thread = await repos.marketingOs.getOrCreateMainThread(workspaceId);
  const existingVersion = asPlanPayload(existing?.payload).version;
  if (existing && existingVersion === BRIEF_VERSION) {
    const messages = await repos.marketingOs.listMessages(thread.id);
    return { brief: existing, thread, messages, created: false };
  }

  if (!hasRealLlmCredentials()) {
    const pendingContent =
      "AI Daily Brief は準備中です。\n\nテキストAIのAPIキー（OPENAI_API_KEY 等）を設定すると、ブランド記憶に基づく今日の指示を自動生成します。\n設定画面で接続状態を確認できます。";
    const payload = {
      version: BRIEF_VERSION,
      source: "pending",
      aiStatus: "pending",
      nextActions: [
        {
          title: "設定でAI接続を確認する",
          why: "Daily Brief・チャット・投稿生成に必要です",
          deepLink: "/admin/account",
        },
      ],
      missions: [],
      expectedEffect: {
        status: "pending",
        note: "AI接続後に表示します",
      },
      yesterday: {
        headline: "AI接続待ち",
        metrics: [],
        metricsStatus: "pending",
        metricsNote: "SNS実測値は準備中です",
        improvements: [],
        cause: "",
        lesson: "",
        scoreOverall: null,
        scoreDelta: null,
      },
    };

    if (existing?.messageId) {
      await repos.marketingOs.updateMessage(existing.messageId, pendingContent, {
        kind: "daily_brief",
        dateKey,
        version: BRIEF_VERSION,
        source: "pending",
      });
      const brief = await repos.marketingOs.updateBrief(existing.id, {
        content: pendingContent,
        payload,
      });
      const messages = await repos.marketingOs.listMessages(thread.id);
      return { brief, thread, messages, created: false };
    }

    const message = await repos.marketingOs.addMessage({
      threadId: thread.id,
      role: "assistant",
      content: pendingContent,
      metadata: {
        kind: "daily_brief",
        dateKey,
        version: BRIEF_VERSION,
        source: "pending",
      },
    });
    const brief = existing
      ? await repos.marketingOs.updateBrief(existing.id, {
          content: pendingContent,
          messageId: message.id,
          payload,
        })
      : await repos.marketingOs.createBrief({
          workspaceId,
          dateKey,
          threadId: thread.id,
          messageId: message.id,
          content: pendingContent,
          payload,
        });
    const messages = await repos.marketingOs.listMessages(thread.id);
    return { brief, thread, messages, created: !existing };
  }

  const brand = await loadBrandMemory(workspaceId);
  const handles = await repos.snsHandles.list(workspaceId);
  const ownerName = await loadOwnerName(workspaceId);
  const improvements = await loadImprovementRows(workspaceId);

  const [tasks, score, scorePair] = await Promise.all([
    ensureTodayTasks(workspaceId),
    (async () => {
      const latest = await repos.marketingOs.latestScore(workspaceId);
      if (latest && tokyoDateKey(latest.createdAt) === dateKey) {
        return {
          overall: latest.overall,
          platforms: latest.platforms as ScoreResult["platforms"],
          reasons: (latest.reasons as string[]) ?? [],
          nextActions: (latest.nextActions as ScoreResult["nextActions"]) ?? [],
          row: latest,
        };
      }
      return generateAiScore(workspaceId);
    })(),
    repos.marketingOs.previousScore(workspaceId),
  ]);

  const scoreDelta =
    scorePair.latest && scorePair.previous
      ? scorePair.latest.overall - scorePair.previous.overall
      : null;

  const { plan } = buildEmployeeDailyBrief({
    brand,
    handles,
    ownerName,
    workspaceId,
    dateKey,
    improvements,
    scoreOverall: score.overall,
    scoreDelta,
  });

  const historyText = formatImprovementsForPrompt(improvements);
  const content = await completeText({
    brand,
    improvementHistory: historyText,
    userPrompt: `あなたは専属AIマーケティング社員です。ログイン直後のデイリーブリーフを、次の構成で自然な会話として書いてください。

必須構成:
1. 挨拶（${plan.greetingName}さん）
2. 昨日の振り返り（捏造のフォロワー増減・保存率は絶対に書かない。AI SCOREと改善履歴のみ使ってよい）
3. SNS実測値は「準備中」と明記
4. 原因 → 改善案 → 実行
5. 今日やるべきこと ①②③（投稿・リール・競合）
6. 予想フォロワー増の数値は出さず「SNS連携後に予測」と書く
7. 「何を手伝いましょうか？」

ブランド「${brand?.brandName ?? ""}」を織り込む。分析ツール口調禁止。

参考（事実のみ）:
- AI SCORE: ${score.overall}${scoreDelta != null ? ` / 前日比 ${scoreDelta}` : ""}
- 改善履歴: ${historyText || "なし"}
- ミッション案: ${plan.missions.map((m) => m.title).join(" / ")}
`,
  });

  const payload = {
    ...plan,
    overallScore: score.overall,
    taskIds: tasks.items.map((t) => t.id),
    nextActions: plan.nextActions,
    brandName: brand?.brandName ?? null,
    source: "llm",
  };

  if (existing?.messageId) {
    await repos.marketingOs.updateMessage(existing.messageId, content, {
      kind: "daily_brief",
      dateKey,
      version: BRIEF_VERSION,
      nextActions: plan.nextActions,
    });
    const brief = await repos.marketingOs.updateBrief(existing.id, {
      content,
      payload,
    });
    const messages = await repos.marketingOs.listMessages(thread.id);
    return { brief, thread, messages, created: false };
  }

  const message = await repos.marketingOs.addMessage({
    threadId: thread.id,
    role: "assistant",
    content,
    metadata: {
      kind: "daily_brief",
      dateKey,
      version: BRIEF_VERSION,
      overallScore: score.overall,
      nextActions: plan.nextActions,
      brandName: brand?.brandName ?? null,
      source: "llm",
    },
  });

  const brief = existing
    ? await repos.marketingOs.updateBrief(existing.id, {
        content,
        messageId: message.id,
        payload,
      })
    : await repos.marketingOs.createBrief({
        workspaceId,
        dateKey,
        threadId: thread.id,
        messageId: message.id,
        content,
        payload,
      });

  const messages = await repos.marketingOs.listMessages(thread.id);
  return { brief, thread, messages, created: !existing };
}

export async function chatWithEmployee(
  workspaceId: string,
  userMessage: string,
) {
  if (!hasRealLlmCredentials()) {
    throw new OsAiUnavailableError();
  }
  const brand = await loadBrandMemory(workspaceId);
  const improvements = await loadImprovementRows(workspaceId);
  const historyText = formatImprovementsForPrompt(improvements);
  const thread = await repos.marketingOs.getOrCreateMainThread(workspaceId);
  await repos.marketingOs.addMessage({
    threadId: thread.id,
    role: "user",
    content: userMessage,
  });
  const history = await repos.marketingOs.listMessages(thread.id);
  const reply = await completeText({
    brand,
    improvementHistory: historyText,
    history: history
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-12)
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    userPrompt: `${userMessage}

必ず「原因 → 改善案 → 実行」の順で答える。
ブランド記憶を前提にし、聞き直さない。
投稿が必要ならコピー用の短い案も添える。
フォロワー増減や保存率の数値は、実測がない限り捏造しない（準備中と書く）。`,
  });
  const assistant = await repos.marketingOs.addMessage({
    threadId: thread.id,
    role: "assistant",
    content: reply,
    metadata: { source: "llm" },
  });
  return { thread, assistant, reply };
}

export async function recordTaskImprovement(
  workspaceId: string,
  itemId: string,
  done: boolean,
) {
  const item = await repos.marketingOs.getTaskItem(itemId);
  if (!item || item.taskSet.workspaceId !== workspaceId) return null;
  const updated = await repos.marketingOs.setTaskDone(itemId, done);
  if (!done) return { item: updated, improvement: null };

  const brand = await loadBrandMemory(workspaceId);
  const { estimateResultForTask } = await import("./daily-brief-engine.js");
  const improvement = await repos.marketingOs.createImprovement({
    workspaceId,
    dateKey: tokyoDateKey(),
    title: item.title,
    cause: brand
      ? `実行タスク完了（${brand.brandName}）`
      : "実行タスク完了",
    action: item.detail || item.title,
    result: estimateResultForTask(item.title, item.category),
    platform: null,
    source: "task",
  });
  return { item: updated, improvement };
}
