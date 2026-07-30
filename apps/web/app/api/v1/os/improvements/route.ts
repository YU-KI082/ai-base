import { repos } from "@ai-base/database";
import { tokyoDateKey } from "@ai-base/marketing-os";
import { withOsUser } from "../_lib";
import { z } from "zod";

export async function GET(request: Request) {
  return withOsUser(request, async (ctx) => {
    const items = await repos.marketingOs.listImprovements(ctx.workspaceId, 30);
    return Response.json({ items });
  });
}

const CreateSchema = z.object({
  title: z.string().min(1).max(200),
  cause: z.string().max(500).optional(),
  action: z.string().max(500).optional(),
  result: z.string().max(300).optional(),
  platform: z.string().max(40).optional(),
});

export async function POST(request: Request) {
  return withOsUser(request, async (ctx) => {
    const body = await request.json().catch(() => null);
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "改善内容を確認してください" }, { status: 400 });
    }
    const item = await repos.marketingOs.createImprovement({
      workspaceId: ctx.workspaceId,
      dateKey: tokyoDateKey(),
      title: parsed.data.title,
      cause: parsed.data.cause,
      action: parsed.data.action,
      result: parsed.data.result,
      platform: parsed.data.platform,
      source: "manual",
    });
    return Response.json({ item });
  });
}
