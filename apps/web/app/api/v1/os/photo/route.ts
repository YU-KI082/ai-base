import {
  createPhotoSession,
  enhancePhotoSession,
  generatePhotoPosts,
  getPhotoSession,
  listPhotoSessions,
  OS_PLATFORMS,
} from "@ai-base/marketing-os";
import { withOsUser } from "../_lib";
import { z } from "zod";

export async function GET(request: Request) {
  return withOsUser(request, async (ctx) => {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (id) {
      const session = await getPhotoSession(ctx.workspaceId, id);
      if (!session) {
        return Response.json({ error: "セッションが見つかりません" }, { status: 404 });
      }
      return Response.json({ session });
    }
    const items = await listPhotoSessions(ctx.workspaceId);
    return Response.json({ items });
  });
}

const UploadSchema = z.object({
  imageDataUrl: z.string().min(32).max(1_200_000),
  fileName: z.string().max(200).optional(),
  mimeType: z.string().max(80).optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  platformTarget: z.enum(OS_PLATFORMS).optional(),
});

export async function POST(request: Request) {
  return withOsUser(request, async (ctx) => {
    const body = await request.json().catch(() => null);
    const parsed = UploadSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "画像を確認してください（JPEG/PNG、大きすぎないこと）" },
        { status: 400 },
      );
    }
    try {
      const result = await createPhotoSession({
        workspaceId: ctx.workspaceId,
        ...parsed.data,
      });
      return Response.json({
        session: result.session,
        analysis: result.analysis,
        preset: result.preset,
        advice: result.advice,
      });
    } catch (e) {
      return Response.json(
        { error: e instanceof Error ? e.message : "アップロードに失敗しました" },
        { status: 400 },
      );
    }
  });
}
