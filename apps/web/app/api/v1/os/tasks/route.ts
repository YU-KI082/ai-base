import { ensureTodayTasks } from "@ai-base/marketing-os";
import { repos } from "@ai-base/database";
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
    const item = await repos.marketingOs.setTaskDone(
      parsed.data.itemId,
      parsed.data.done,
    );
    void ctx;
    return Response.json({ item });
  });
}
