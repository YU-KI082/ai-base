import { z } from "zod";
import { OS_PLATFORMS } from "@ai-base/marketing-os";
import { repos } from "@ai-base/database";
import { withOsUser } from "../_lib";

const HandlesSchema = z.object({
  handles: z.array(
    z.object({
      platform: z.enum(OS_PLATFORMS),
      username: z.string().max(100),
    }),
  ),
});

export async function GET(request: Request) {
  return withOsUser(request, async (ctx) => {
    const handles = await repos.snsHandles.list(ctx.workspaceId);
    return Response.json({ handles });
  });
}

export async function PUT(request: Request) {
  return withOsUser(request, async (ctx) => {
    const body = await request.json().catch(() => null);
    const parsed = HandlesSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "SNSユーザー名を確認してください" }, { status: 400 });
    }
    await repos.snsHandles.upsertMany(ctx.workspaceId, parsed.data.handles);
    const handles = await repos.snsHandles.list(ctx.workspaceId);
    return Response.json({ ok: true, handles });
  });
}
