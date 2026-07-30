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
  const fallback: TaskDraft[] = [
    {
      title: "今日投稿すべき内容を決めてキャプションを生成する",
      detail: "ワンクリック生成→コピー投稿",
      category: "post",
      deepLink: "/admin/posts",
    },
    {
      title: "おすすめ時間帯にリール or 短尺を1本用意する",
      detail: "黄金時間の仮説で今夜か翌朝",
      category: "reel",
      deepLink: "/admin/posts",
    },
    {
      title: "競合の保存されやすい投稿に有益コメントを3件する",
      detail: "売り込み禁止。価値提供コメント",
      category: "engage",
      deepLink: "/admin/tasks",
    },
    {
      title: "プロフィールの改善点を1つ実行する",
      detail: "一言目・ハイライト・リンクのいずれか",
      category: "improve",
      deepLink: "/admin/analysis",
    },
  ];

  const raw = await completeJson<{ tasks: TaskDraft[] }>({
    brand,
    userPrompt: `今日（${dateKey} Asia/Tokyo）のSNSマーケタスクを作ってください。

${brand ? formatBrandForPrompt(brand) : "ブランド未設定"}

必ず含める観点: 今日の投稿、おすすめ時間、リール企画、ストーリー案、コメントすべき内容、改善タスク。

JSON: { "tasks": [{ "title": string, "detail": string, "category": string, "deepLink"?: string }] }
5〜7件。`,
    fallback: { tasks: fallback },
  });

  const tasks = raw.tasks?.length ? raw.tasks : fallback;
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
