import { enhancePhotoSession } from "@ai-base/marketing-os";
import { withOsUser } from "../../../_lib";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return withOsUser(request, async (ctx) => {
    const { id } = await context.params;
    try {
      const result = await enhancePhotoSession(ctx.workspaceId, id);
      return Response.json(result);
    } catch (e) {
      return Response.json(
        { error: e instanceof Error ? e.message : "改善に失敗しました" },
        { status: 400 },
      );
    }
  });
}
