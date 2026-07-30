import { recordTaskImprovement, ensureTodayTasks } from "@ai-base/marketing-os";
import { withOsUser } from "../_lib";
import { z } from "zod";

export async function GET(request: Request) {
  return withOsUser(request, async (ctx) => {
    const set = await ensureTodayTasks(ctx.workspaceId);
    return Response.json({ taskSet: set });
  });
}

export async function POST(request: Request) {
  return withOsUser(request, async (ctx) => {
    const set = await ensureTodayTasks(ctx.workspaceId);
    return Response.json({ taskSet: set });
  });
}

const PatchSchema = z.object({
  itemId: z.string().min(1),
  done: z.boolean(),
});

export async function PATCH(request: Request) {
  return withOsUser(request, async (ctx) => {
    const body = await request.json().catch(() => null);
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "タスクの更新内容を確認してください" }, { status: 400 });
    }
    const result = await recordTaskImprovement(
      ctx.workspaceId,
      parsed.data.itemId,
      parsed.data.done,
    );
    if (!result) {
      return Response.json({ error: "タスクが見つかりません" }, { status: 404 });
    }
    return Response.json({
      item: result.item,
      improvement: result.improvement,
    });
  });
}
