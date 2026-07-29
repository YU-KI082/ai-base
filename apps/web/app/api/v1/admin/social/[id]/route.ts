import { z } from "zod";
import { repos } from "@ai-base/database";
import {
  EventTypes,
  createEvent,
  enqueueEvent,
} from "@ai-base/events";
import { withAdmin } from "@/app/api/v1/_lib/admin";
import { jsonError, jsonOk, readJsonSchema } from "@/app/api/v1/_lib/http";
import {
  ensureReadyForPublish,
  oauthProviderForPlatform,
} from "@ai-base/sns-oauth";

const PatchSchema = z.object({
  status: z.enum([
    "draft",
    "pending_approval",
    "ready",
    "scheduled",
    "published",
    "failed",
    "retry",
    "rejected",
  ]),
  scheduledAt: z.string().datetime().optional(),
  mediaUrl: z.string().url().optional().nullable(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return withAdmin(request, "settings.manage", async (user) => {
    const { id } = await context.params;
    let body: z.infer<typeof PatchSchema>;
    try {
      body = await readJsonSchema(request, PatchSchema);
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : String(error), 400);
    }

    const existing = await repos.socialPosts.findById(id);
    if (!existing) return jsonError("Not found", 404);

    // External SNS publish only after human approval + live OAuth check.
    if (body.status === "published" || body.status === "scheduled") {
      const provider = oauthProviderForPlatform(existing.platform);
      if (provider && body.status === "published") {
        if (
          existing.status !== "ready" &&
          existing.status !== "scheduled" &&
          existing.status !== "retry" &&
          existing.status !== "published"
        ) {
          return jsonError(
            "外部投稿は「準備完了/予約/再試行」承認後のみ実行できます",
            400,
          );
        }
        const ready = await ensureReadyForPublish(existing.platform);
        if (!ready.ok) {
          return jsonError(
            `SNS接続を確認できません（${ready.reason}）。管理画面で再認証してください。`,
            409,
          );
        }
        const item = await repos.socialPosts.updateStatus(id, "ready");
        if (body.mediaUrl !== undefined) {
          await repos.socialPosts.updateMedia(id, body.mediaUrl);
        }
        await enqueueEvent(
          createEvent({
            type: EventTypes.SnsPostPublishRequested,
            source: "admin:social",
            dataschema: "https://ai-base.local/schemas/sns-post-publish.json",
            correlationid: id,
            subject: id,
            data: {
              socialPostId: id,
              platform: existing.platform,
              approvedBy: user.email,
            },
          }),
        );
        await repos.logs.write({
          level: "info",
          source: "admin-social",
          message: `外部投稿をキューイング: ${id} (${existing.platform})`,
          context: { socialPostId: id, platform: existing.platform },
        });
        return jsonOk({
          item,
          queued: true,
          message:
            "接続確認済み。承認済み投稿を外部SNSへ送信キューに入れました。未対応API時は動画・説明文を生成したまま投稿待ちになります。",
        });
      }
    }

    if (body.mediaUrl !== undefined) {
      await repos.socialPosts.updateMedia(id, body.mediaUrl);
    }
    const item = await repos.socialPosts.updateStatus(id, body.status);
    if (body.scheduledAt) {
      await repos.socialPosts.setScheduledAt(id, new Date(body.scheduledAt));
    }
    return jsonOk({ item });
  });
}
