import {
  generatePhotoPosts,
  OS_PLATFORMS,
  OsAiUnavailableError,
} from "@ai-base/marketing-os";
import { withOsUser } from "../../../_lib";
import { z } from "zod";

const BodySchema = z.object({
  platform: z.enum(OS_PLATFORMS).optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return withOsUser(request, async (ctx) => {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "媒体を確認してください" }, { status: 400 });
    }
    try {
      const result = await generatePhotoPosts(
        ctx.workspaceId,
        id,
        parsed.data.platform,
      );
      return Response.json(result);
    } catch (e) {
      if (e instanceof OsAiUnavailableError) throw e;
      return Response.json(
        { error: e instanceof Error ? e.message : "投稿生成に失敗しました" },
        { status: 400 },
      );
    }
  });
}
