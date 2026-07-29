import type { AgentPlugin } from "@ai-base/agents-sdk";
import {
  EventTypes,
  createEvent,
  parseEvent,
  SnsAutoOpsTickDataSchema,
} from "@ai-base/events";
import { repos } from "@ai-base/database";
import {
  createCriticalAlert,
  decideForPost,
  evaluateAutoStop,
  loadAutoOpsSettings,
  publishBackoffMs,
  runFullAutoPipeline,
} from "@ai-base/sns-auto-ops";

/**
 * Fully-automatic SNS ops:
 * theme → content → video render → policy → publish queue → metrics/learn (via peer events).
 * Human approval is NOT required when mode=full_auto.
 * Only critical auto-stop / 3x failures notify admins.
 */
export const snsAutoOpsPlugin: AgentPlugin = {
  manifest: {
    key: "sns-auto-ops",
    version: "0.2.0",
    displayName: { en: "SNS Auto Ops", ja: "SNS完全自動運用" },
    subscribe: [EventTypes.SnsAutoOpsTick],
    publish: [
      EventTypes.SnsTrendScoutRequested,
      EventTypes.SnsFeedbackTick,
      EventTypes.SnsOAuthRefreshTick,
      EventTypes.SnsPostPublishRequested,
      EventTypes.SnsAutoOpsAlert,
      EventTypes.SnsRecommendRequested,
    ],
    capabilities: [
      "full_auto_pipeline",
      "theme_select",
      "video_render",
      "auto_publish_gate",
      "revenue_ops",
      "safety_limits",
      "auto_stop",
    ],
  },

  async handle(ctx, event) {
    if (event.type !== EventTypes.SnsAutoOpsTick) return;
    parseEvent(event, SnsAutoOpsTickDataSchema);

    const settings = await loadAutoOpsSettings();
    if (settings.emergencyStop) {
      await ctx.logger.info("Auto-ops skipped: emergency stop ON");
      return;
    }

    // OAuth refresh + learning signals
    await ctx.publish(
      createEvent({
        type: EventTypes.SnsOAuthRefreshTick,
        source: "agent:sns-auto-ops",
        dataschema: "https://ai-base.local/schemas/sns-oauth-refresh.json",
        correlationid: event.correlationid,
        causationid: event.id,
        data: { reason: "cron" as const },
      }),
    );
    await ctx.publish(
      createEvent({
        type: EventTypes.SnsTrendScoutRequested,
        source: "agent:sns-auto-ops",
        dataschema: "https://ai-base.local/schemas/sns.trend.scout.requested.v1.json",
        correlationid: event.correlationid,
        causationid: event.id,
        data: {
          platforms: settings.platformsEnabled.filter((p) =>
            ["instagram", "tiktok"].includes(p),
          ),
          locales: ["ja", "en"],
          useSeedCatalog: true,
        },
      }),
    );
    for (const windowHours of [24, 72, 168] as const) {
      await ctx.publish(
        createEvent({
          type: EventTypes.SnsFeedbackTick,
          source: "agent:sns-auto-ops",
          dataschema: "https://ai-base.local/schemas/sns.feedback.tick.v1.json",
          correlationid: event.correlationid,
          causationid: event.id,
          data: { windowHours },
        }),
      );
    }

    // 1) Plan → generate → render → create ready posts
    if (settings.mode === "full_auto") {
      try {
        const run = await runFullAutoPipeline({
          platforms: settings.platformsEnabled,
          locale: "ja",
        });
        await ctx.logger.info(
          `Full-auto pipeline theme=${run.theme.kind}/${run.theme.toolName} posts=${run.postIds.length} queued=${run.publishQueued.length}`,
        );
        for (const postId of run.publishQueued) {
          const post = await repos.socialPosts.findById(postId);
          if (!post || post.externalPostId) continue;
          // Exponential backoff if prior attempts exist
          if (post.publishAttempts > 0) {
            const delay = publishBackoffMs(post.publishAttempts);
            await ctx.logger.info(
              `Backoff ${delay}ms before re-publish ${postId} attempt=${post.publishAttempts}`,
            );
          }
          await ctx.publish(
            createEvent({
              type: EventTypes.SnsPostPublishRequested,
              source: "agent:sns-auto-ops",
              dataschema: "https://ai-base.local/schemas/sns-post-publish.json",
              correlationid: event.correlationid,
              causationid: event.id,
              subject: post.id,
              data: {
                socialPostId: post.id,
                platform: post.platform,
                approvedBy: "auto-ops",
              },
            }),
          );
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await ctx.logger.error(`Full-auto pipeline failed: ${message}`);
        await createCriticalAlert({
          kind: "pipeline_error",
          title: "SNS自動パイプラインエラー",
          message,
        });
      }
    }

    // 2) Also gate any leftover drafts/ready items
    const candidates = await repos.socialPosts.listDraftsForAutoOps(20);
    let queued = 0;
    let failures = 0;

    for (const post of candidates) {
      if (!settings.platformsEnabled.includes(post.platform as never)) {
        continue;
      }

      const decision = await decideForPost(post.id);
      await repos.logs.write({
        level: "info",
        source: "sns-auto-ops",
        message: `自動判定 ${post.id}: ${decision.action} — ${decision.reasons.join("; ")}`,
        context: decision.decision as object,
      });

      if (decision.action === "mark_ready") {
        await repos.socialPosts.updateStatus(post.id, "ready");
      }

      if (decision.action === "queue_publish") {
        if (post.externalPostId) continue;
        if (post.publishAttempts > 0) {
          await new Promise((r) =>
            setTimeout(r, Math.min(publishBackoffMs(post.publishAttempts), 5_000)),
          );
        }
        await repos.socialPosts.updateStatus(post.id, "ready");
        await repos.socialPosts.incrementPublishAttempts(post.id);
        await ctx.publish(
          createEvent({
            type: EventTypes.SnsPostPublishRequested,
            source: "agent:sns-auto-ops",
            dataschema: "https://ai-base.local/schemas/sns-post-publish.json",
            correlationid: event.correlationid,
            causationid: event.id,
            subject: post.id,
            data: {
              socialPostId: post.id,
              platform: post.platform,
              approvedBy: "auto-ops",
            },
          }),
        );
        queued += 1;
        if (queued >= Math.max(1, settings.dailyPostLimit)) break;
      }

      if (
        decision.action === "hold_draft" &&
        post.publishAttempts >= settings.maxPublishRetries
      ) {
        failures += 1;
      }
    }

    if (failures >= settings.consecutiveFailureAlertThreshold) {
      await evaluateAutoStop({
        reason: "consecutive_failures",
        message: `自動公開できない投稿が ${failures} 件以上あります`,
      });
      await ctx.publish(
        createEvent({
          type: EventTypes.SnsAutoOpsAlert,
          source: "agent:sns-auto-ops",
          dataschema: "https://ai-base.local/schemas/sns-auto-ops-alert.json",
          correlationid: event.correlationid,
          causationid: event.id,
          data: {
            kind: "publish_failures",
            title: "投稿が連続で失敗しています",
            message: `failures=${failures}`,
          },
        }),
      );
    }

    // Trigger learning recommend for next cycle
    await ctx.publish(
      createEvent({
        type: EventTypes.SnsRecommendRequested,
        source: "agent:sns-auto-ops",
        dataschema: "https://ai-base.local/schemas/sns.recommend.requested.v1.json",
        correlationid: event.correlationid,
        causationid: event.id,
        data: { limit: 6 },
      }),
    );

    await ctx.logger.info(
      `Auto-ops tick done candidates=${candidates.length} queued=${queued}`,
    );
  },
};
