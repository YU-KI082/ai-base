import { repos } from "@ai-base/database";
import { completeJson } from "./llm.js";
import { loadBrandMemory, formatBrandForPrompt } from "./brand-memory.js";
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

  const raw = await completeJson<{ tasks: TaskDraft[] }>({
    brand,
    userPrompt: `今日（${dateKey} Asia/Tokyo）のSNSマーケタスクを作ってください。ブランド名をタスク文に含めること。

${brand ? formatBrandForPrompt(brand) : "ブランド未設定"}

必ず含める観点: 今日の投稿、おすすめ時間、リール企画、ストーリー案、コメントすべき内容、改善タスク。
捏造のフォロワー増減数値は書かないこと。

JSON: { "tasks": [{ "title": string, "detail": string, "category": string, "deepLink"?: string }] }
5〜7件。deepLink は /admin/create /admin/studio /admin/analysis /admin/brand /admin#tasks のいずれか。`,
  });

  if (!raw.tasks?.length) {
    throw new Error("今日のタスク生成に失敗しました。再試行してください。");
  }

  await repos.marketingOs.replaceTaskItems(
    set.id,
    raw.tasks.map((t, i) => ({
      title: t.title,
      detail: t.detail,
      category: t.category,
      priority: i,
      deepLink: t.deepLink ?? null,
    })),
  );
  return repos.marketingOs.getOrCreateTaskSet(workspaceId, dateKey);
}
