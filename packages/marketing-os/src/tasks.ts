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

const ALLOWED_DEEP_LINKS = new Set([
  "/admin/create",
  "/admin/studio",
  "/admin/analysis",
  "/admin/brand",
  "/admin#tasks",
]);

function normalizeTaskDrafts(raw: unknown): TaskDraft[] {
  const list = Array.isArray((raw as { tasks?: unknown })?.tasks)
    ? ((raw as { tasks: unknown[] }).tasks as unknown[])
    : Array.isArray(raw)
      ? (raw as unknown[])
      : [];

  const out: TaskDraft[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const title = String(row.title ?? "").trim();
    const detail = String(row.detail ?? "").trim();
    const category = String(row.category ?? "general").trim() || "general";
    const deepLinkRaw = String(row.deepLink ?? "").trim();
    const resolvedTitle = title || detail.slice(0, 80);
    if (!resolvedTitle) continue;
    out.push({
      title: resolvedTitle.slice(0, 120),
      detail: detail || resolvedTitle,
      category: category.slice(0, 40),
      deepLink: ALLOWED_DEEP_LINKS.has(deepLinkRaw) ? deepLinkRaw : undefined,
    });
  }
  return out;
}

export async function ensureTodayTasks(workspaceId: string) {
  const dateKey = tokyoDateKey();
  const set = await repos.marketingOs.getOrCreateTaskSet(workspaceId, dateKey);
  // Partial inserts from a previous failed LLM response should be regenerated.
  if (set.items.length >= 3) return set;

  const brand = await loadBrandMemory(workspaceId);

  const raw = await completeJson<{ tasks: TaskDraft[] }>({
    brand,
    userPrompt: `今日（${dateKey} Asia/Tokyo）のSNSマーケタスクを作ってください。ブランド名をタスク文に含めること。

${brand ? formatBrandForPrompt(brand) : "ブランド未設定"}

必ず含める観点: 今日の投稿、おすすめ時間、リール企画、ストーリー案、コメントすべき内容、改善タスク。
捏造のフォロワー増減数値は書かないこと。

各要素で title は必須（空禁止）。detail / category も必ず埋めること。
JSON: { "tasks": [{ "title": string, "detail": string, "category": string, "deepLink"?: string }] }
5〜7件。deepLink は /admin/create /admin/studio /admin/analysis /admin/brand /admin#tasks のいずれか。`,
  });

  const tasks = normalizeTaskDrafts(raw);
  if (tasks.length < 3) {
    throw new Error("今日のタスク生成に失敗しました。再試行してください。");
  }

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
