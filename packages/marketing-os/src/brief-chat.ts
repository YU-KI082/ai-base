import { repos } from "@ai-base/database";
import { completeText } from "./llm.js";
import { loadBrandMemory } from "./brand-memory.js";
import { ensureTodayTasks } from "./tasks.js";
import { generateAiScore } from "./score.js";
import {
  buildBrandBrief,
  buildBrandChatReply,
} from "./brand-engine.js";
import { tokyoDateKey } from "./persona.js";

export async function ensureDailyBrief(workspaceId: string) {
  const dateKey = tokyoDateKey();
  const existing = await repos.marketingOs.findBrief(workspaceId, dateKey);
  const thread = await repos.marketingOs.getOrCreateMainThread(workspaceId);
  if (existing) {
    const messages = await repos.marketingOs.listMessages(thread.id);
    return { brief: existing, thread, messages, created: false };
  }

  const brand = await loadBrandMemory(workspaceId);
  const handles = await repos.snsHandles.list(workspaceId);
  const [tasks, score] = await Promise.all([
    ensureTodayTasks(workspaceId),
    generateAiScore(workspaceId),
  ]);

  const taskLines = tasks.items
    .slice(0, 5)
    .map((t, i) => `${i + 1}. ${t.title}`)
    .join("\n");
  const scoreLines = Object.entries(score.platforms)
    .map(([k, v]) => `- ${k}: ${v.score}点（${v.reason}）`)
    .join("\n");

  const llmContent = await completeText({
    brand,
    userPrompt: `ログインしたユーザーに、今日のブリーフィングを自然な会話で伝えてください。ブランド名「${brand?.brandName ?? ""}」を必ず呼ぶこと。

総合AI SCORE: ${score.overall}
媒体別:
${scoreLines}

今日のタスク:
${taskLines}

必ず含める:
1. 今日やること（優先順）
2. 改善点
3. 投稿案の方向性（具体的なフック案を1つ）
4. 競合・市場の気づき
5. 今すぐの次の一手（1つに絞る）

分析だけで終わらない。行動を促す。丁寧な日本語。`,
  });

  const content =
    llmContent ||
    buildBrandBrief({
      brand,
      scoreOverall: score.overall,
      scoreLines,
      taskLines,
      handles,
    });

  const message = await repos.marketingOs.addMessage({
    threadId: thread.id,
    role: "assistant",
    content,
    metadata: {
      kind: "daily_brief",
      dateKey,
      overallScore: score.overall,
      nextActions: score.nextActions,
      brandName: brand?.brandName ?? null,
      source: llmContent ? "llm" : "brand_engine",
    },
  });

  const brief = await repos.marketingOs.createBrief({
    workspaceId,
    dateKey,
    threadId: thread.id,
    messageId: message.id,
    content,
    payload: {
      overallScore: score.overall,
      taskIds: tasks.items.map((t) => t.id),
      nextActions: score.nextActions,
      brandName: brand?.brandName ?? null,
    },
  });

  const messages = await repos.marketingOs.listMessages(thread.id);
  return { brief, thread, messages, created: true };
}

export async function chatWithEmployee(
  workspaceId: string,
  userMessage: string,
) {
  const brand = await loadBrandMemory(workspaceId);
  const thread = await repos.marketingOs.getOrCreateMainThread(workspaceId);
  await repos.marketingOs.addMessage({
    threadId: thread.id,
    role: "user",
    content: userMessage,
  });
  const history = await repos.marketingOs.listMessages(thread.id);
  const llmReply = await completeText({
    brand,
    history: history
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-12)
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    userPrompt: `${userMessage}

（必要なら次の一手を具体的に。投稿が必要ならコピー用キャプション案も短く添える。ブランド名を呼ぶ）`,
  });
  const reply = llmReply || buildBrandChatReply(brand, userMessage);
  const assistant = await repos.marketingOs.addMessage({
    threadId: thread.id,
    role: "assistant",
    content: reply,
    metadata: { source: llmReply ? "llm" : "brand_engine" },
  });
  return { thread, assistant, reply };
}
