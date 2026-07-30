import { prisma, repos } from "@ai-base/database";
import { completeText } from "./llm.js";
import { loadBrandMemory } from "./brand-memory.js";
import { ensureTodayTasks } from "./tasks.js";
import { generateAiScore } from "./score.js";
import { buildBrandChatReply } from "./brand-engine.js";
import {
  buildEmployeeDailyBrief,
  estimateResultForTask,
  type ImprovementRow,
} from "./daily-brief-engine.js";
import {
  formatImprovementsForPrompt,
  tokyoDateKey,
} from "./persona.js";

const BRIEF_VERSION = "employee-v2";

function asPlanPayload(payload: unknown): { version?: string } {
  if (payload && typeof payload === "object") return payload as { version?: string };
  return {};
}

async function loadOwnerName(workspaceId: string): Promise<string | null> {
  const ws = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: { owner: true },
  });
  return ws?.owner?.name ?? null;
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

  const brand = await loadBrandMemory(workspaceId);
  const handles = await repos.snsHandles.list(workspaceId);
  const ownerName = await loadOwnerName(workspaceId);
  const improvements = await loadImprovementRows(workspaceId);

  const [tasks, score, scorePair] = await Promise.all([
    ensureTodayTasks(workspaceId),
    generateAiScore(workspaceId),
    repos.marketingOs.previousScore(workspaceId),
  ]);

  const scoreDelta =
    scorePair.latest && scorePair.previous
      ? scorePair.latest.overall - scorePair.previous.overall
      : null;

  const { content: engineContent, plan } = buildEmployeeDailyBrief({
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
  const llmContent = await completeText({
    brand,
    improvementHistory: historyText,
    userPrompt: `あなたは専属AIマーケティング社員です。ログイン直後のデイリーブリーフを、次の構成で自然な会話として書いてください。

必須構成（この順番・見出し感を保つ）:
1. 「おはようございます/こんにちは、{名前}さん。」
2. 「昨日の分析が完了しました。」
3. Instagram等の媒体別（フォロワー増減・保存率・改善点数）
4. 原因 → 改善案 → 実行
5. 今日やるべきこと ①投稿（時刻付き）②リール撮影③競合参考
6. 今日の予想効果（フォロワー +N〜M人）
7. 「何を手伝いましょうか？」

ブランド名「${brand?.brandName ?? ""}」とターゲットを必ず織り込む。
分析ツール口調禁止。同僚マーケターとして話す。

参考データ（数値はこれか近い値を使う）:
${engineContent}
`,
  });

  const content = llmContent || engineContent;
  const payload = {
    ...plan,
    overallScore: score.overall,
    taskIds: tasks.items.map((t) => t.id),
    nextActions: plan.nextActions,
    brandName: brand?.brandName ?? null,
    source: llmContent ? "llm" : "brand_engine",
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
      source: llmContent ? "llm" : "brand_engine",
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
  const llmReply = await completeText({
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
投稿が必要ならコピー用の短い案も添える。`,
  });
  const reply =
    llmReply ||
    buildBrandChatReply(brand, userMessage, improvements);
  const assistant = await repos.marketingOs.addMessage({
    threadId: thread.id,
    role: "assistant",
    content: reply,
    metadata: { source: llmReply ? "llm" : "brand_engine" },
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
  const improvement = await repos.marketingOs.createImprovement({
    workspaceId,
    dateKey: tokyoDateKey(),
    title: item.title,
    cause: brand
      ? `「${brand.concept || "価値"}」が「${brand.targetAudience || "顧客"}」に伝わりきれていなかった`
      : "実行前のギャップ",
    action: item.detail || item.title,
    result: estimateResultForTask(item.title, item.category),
    source: "task",
    metadata: { taskItemId: item.id, category: item.category },
  });
  return { item: updated, improvement };
}

export { estimateResultForTask };
