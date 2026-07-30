import { repos } from "@ai-base/database";
import {
  ensureTodayTasks,
  parseWorkspaceSettings,
  tokyoDateKey,
} from "@ai-base/marketing-os";
import { withOsUser } from "../_lib";

/**
 * Synthesized inbox from existing brief + tasks (no duplicate notification table).
 * Respects workspace.settings.notifications toggles.
 */
export async function GET(request: Request) {
  return withOsUser(request, async (ctx) => {
    const ws = await repos.workspaces.findById(ctx.workspaceId);
    const settings = parseWorkspaceSettings(ws?.settings);
    const dateKey = tokyoDateKey();
    const items: Array<{
      id: string;
      title: string;
      body: string;
      href: string;
      kind: "brief" | "task";
    }> = [];

    if (settings.notifications?.dailyBrief !== false) {
      const brief = await repos.marketingOs.findBrief(ctx.workspaceId, dateKey);
      if (brief) {
        items.push({
          id: `brief-${dateKey}`,
          title: "今日の AI Daily Brief",
          body: "原因→改善→実行の今日の指示が用意されています",
          href: "/admin",
          kind: "brief",
        });
      }
    }

    if (settings.notifications?.tasks !== false) {
      const taskSet = await ensureTodayTasks(ctx.workspaceId);
      const open = taskSet.items.filter((i) => !i.doneAt);
      for (const t of open.slice(0, 5)) {
        items.push({
          id: `task-${t.id}`,
          title: t.title,
          body: t.detail || "今日のタスク",
          href: t.deepLink || "/admin#tasks",
          kind: "task",
        });
      }
    }

    return Response.json({
      items,
      unread: items.filter((i) => i.kind === "task").length,
      dateKey,
    });
  });
}
