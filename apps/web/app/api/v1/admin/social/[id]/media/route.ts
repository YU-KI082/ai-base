import { z } from "zod";
import { repos } from "@ai-base/database";
import { withAdmin } from "@/app/api/v1/_lib/admin";
import { jsonError, jsonOk, readJsonSchema } from "@/app/api/v1/_lib/http";
import {
  getAccessToken,
  getProvider,
  oauthProviderForPlatform,
} from "@ai-base/sns-oauth";
import { assertNoFabricatedMetrics } from "@ai-base/sns-learning";

const AttachSchema = z.object({
  mediaUrl: z.string().url().nullable(),
  scheduledAt: z.string().datetime().nullable().optional(),
});

const MetricsSyncSchema = z.object({
  windowHours: z.union([z.literal(24), z.literal(72), z.literal(168)]).default(24),
});

/**
 * POST ?action=attach_media — set 9:16 mediaUrl for TikTok PULL_FROM_URL
 * POST ?action=sync_metrics — pull official TikTok analytics when available
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return withAdmin(request, "settings.manage", async () => {
    const { id } = await context.params;
    const post = await repos.socialPosts.findById(id);
    if (!post) return jsonError("Not found", 404);

    const action = new URL(request.url).searchParams.get("action");

    if (action === "attach_media") {
      let body: z.infer<typeof AttachSchema>;
      try {
        body = await readJsonSchema(request, AttachSchema);
      } catch (error) {
        return jsonError(error instanceof Error ? error.message : String(error), 400);
      }
      const item = await repos.socialPosts.updateMedia(id, body.mediaUrl);
      if (body.scheduledAt) {
        await repos.socialPosts.setScheduledAt(id, new Date(body.scheduledAt));
      }
      return jsonOk({ item });
    }

    if (action === "sync_metrics") {
      let body: z.infer<typeof MetricsSyncSchema> = { windowHours: 24 };
      try {
        body = await readJsonSchema(request, MetricsSyncSchema);
      } catch {
        /* default window */
      }
      if (post.platform !== "tiktok") {
        return jsonError("Metrics sync is TikTok-first", 400);
      }
      if (!post.externalPostId) {
        return jsonError("No externalPostId — publish first", 400);
      }
      const provider = oauthProviderForPlatform("tiktok");
      if (!provider) return jsonError("TikTok provider missing", 500);
      const port = getProvider(provider);
      if (!port.fetchVideoMetrics) {
        return jsonError("TikTok metrics fetcher not available", 501);
      }
      const token = await getAccessToken(provider);
      if (!token) return jsonError("TikTok OAuth not connected", 400);
      const metrics = await port.fetchVideoMetrics({
        accessToken: token,
        externalPostId: post.externalPostId,
      });
      if (!metrics) {
        return jsonOk({
          pulled: false,
          message:
            "Official metrics unavailable (scope/audit). Use /api/v1/admin/sns/metrics to ingest.",
        });
      }
      assertNoFabricatedMetrics(metrics);
      await repos.snsLearning.createMetrics({
        socialPost: { connect: { id } },
        windowHours: body.windowHours,
        source: "tiktok_api",
        plays: metrics.plays ?? null,
        likesCount: metrics.likesCount ?? null,
        commentsCount: metrics.commentsCount ?? null,
        sharesCount: metrics.sharesCount ?? null,
        likeRate: metrics.likeRate ?? null,
        commentRate: metrics.commentRate ?? null,
        shareRate: metrics.shareRate ?? null,
        avgWatchSec: metrics.avgWatchSec ?? null,
        watchRetentionRate: metrics.watchRetentionRate ?? null,
        completionRate: metrics.completionRate ?? null,
        hold3SecRate: metrics.hold3SecRate ?? null,
        saveRate: metrics.saveRate ?? null,
        savesCount: metrics.savesCount ?? null,
        profileVisitRate: metrics.profileVisitRate ?? null,
        profileVisits: metrics.profileVisits ?? null,
        linkClickRate: metrics.linkClickRate ?? null,
        affiliateClicks: metrics.affiliateClicks ?? null,
        conversions: metrics.conversions ?? null,
        revenue: metrics.revenue ?? null,
      });
      return jsonOk({ pulled: true, metrics });
    }

    return jsonError("Unknown action (attach_media | sync_metrics)", 400);
  });
}
