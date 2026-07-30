import { repos } from "@ai-base/database";
import { completeJson } from "./llm.js";
import { loadBrandMemory, formatBrandForPrompt } from "./brand-memory.js";
import { buildBrandTasks } from "./brand-engine.js";
import { tokyoDateKey } from "./persona.js";

type TaskDraft = {
  title: string;
  detail: string;
  category: string;
  deepLink?: string;
};

export async function ensureTodayTasks(workspaceId: string) {
  const dateKey = tokyoDateKey();
  const set = await repos.marketingOs.getOrCreateTaskSet(workspaceId, dateKey);
  if (set.items.length > 0) return set;

  const brand = await loadBrandMemory(workspaceId);
  const engineTasks = buildBrandTasks(brand);

  const raw = await completeJson<{ tasks: TaskDraft[] }>({
    brand,
    userPrompt: `今日（${dateKey} Asia/Tokyo）のSNSマーケタスクを作ってください。ブランド名をタスク文に含めること。

${brand ? formatBrandForPrompt(brand) : "ブランド未設定"}

必ず含める観点: 今日の投稿、おすすめ時間、リール企画、ストーリー案、コメントすべき内容、改善タスク。

JSON: { "tasks": [{ "title": string, "detail": string, "category": string, "deepLink"?: string }] }
5〜7件。`,
  });

  const tasks = raw?.tasks?.length ? raw.tasks : engineTasks;
  await repos.marketingOs.replaceTaskItems(
    set.id,
    tasks.map((t, i) => ({
      title: t.title,
      detail: t.detail,
      category: t.category,
      priority: i,
      deepLink: t.deepLink ?? null,
    })),
  );
  return repos.marketingOs.getOrCreateTaskSet(workspaceId, dateKey);
}
