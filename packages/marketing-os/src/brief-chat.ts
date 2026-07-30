import { repos } from "@ai-base/database";
import { completeText } from "./llm.js";
import { loadBrandMemory } from "./brand-memory.js";
import { ensureTodayTasks } from "./tasks.js";
import { generateAiScore } from "./score.js";
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

  const content = await completeText({
    brand,
    userPrompt: `ログインしたユーザーに、今日のブリーフィングを自然な会話で伝えてください。

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

分析だけで終わらない。行動を促す。丁寧な日本語。見出しは使っても良いがチャットメッセージとして自然に。`,
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
  const reply = await completeText({
    brand,
    history: history
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-12)
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    userPrompt: `${userMessage}

（必要なら次の一手を具体的に。投稿が必要ならコピー用キャプション案も短く添える）`,
  });
  const assistant = await repos.marketingOs.addMessage({
    threadId: thread.id,
    role: "assistant",
    content: reply,
  });
  return { thread, assistant, reply };
}
