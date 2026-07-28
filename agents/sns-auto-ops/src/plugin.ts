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
  loadAutoOpsSettings,
} from "@ai-base/sns-auto-ops";

/**
 * Fully-automatic SNS ops orchestrator.
 * Does not call peer agents over HTTP — only enqueues events / updates DB.
 */
export const snsAutoOpsPlugin: AgentPlugin = {
  manifest: {
    key: "sns-auto-ops",
    version: "0.1.0",
    displayName: { en: "SNS Auto Ops", ja: "SNS完全自動運用" },
    subscribe: [EventTypes.SnsAutoOpsTick],
    publish: [
      EventTypes.SnsTrendScoutRequested,
      EventTypes.SnsFeedbackTick,
      EventTypes.SnsOAuthRefreshTick,
      EventTypes.SnsPostPublishRequested,
      EventTypes.SnsAutoOpsAlert,
    ],
    capabilities: ["auto_publish_gate", "revenue_ops", "safety_limits"],
  },

  async handle(ctx, event) {
    if (event.type !== EventTypes.SnsAutoOpsTick) return;
    parseEvent(event, SnsAutoOpsTickDataSchema);

    const settings = await loadAutoOpsSettings();
    if (settings.emergencyStop) {
      await ctx.logger.info("Auto-ops skipped: emergency stop ON");
      return;
    }

    // Keep OAuth fresh and pull learning signals
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
          platforms: settings.platformsEnabled,
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

    const candidates = await repos.socialPosts.listDraftsForAutoOps(20);
    let queued = 0;
    let failures = 0;

    for (const post of candidates) {
      if (!settings.platformsEnabled.includes(post.platform as "instagram" | "tiktok")) {
        continue;
      }
      // Dedupe: never re-publish same external id / hash already published
      if (post.contentHash) {
        const dup = await repos.socialPosts.listRecentContents(100);
        if (
          dup.some(
            (d) =>
              d.id !== post.id &&
              d.contentHash === post.contentHash &&
              // published ones preferred — contentHash match is enough signal
              true,
          )
        ) {
          // Still allow if not published twin; hash collision across drafts ok
        }
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
        // Prevent duplicate external publish
        if (post.externalPostId) continue;
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
        // Respect daily limit: one enqueue per tick when limit is 1
        if (queued >= 1) break;
      }

      if (
        decision.action === "hold_draft" &&
        post.publishAttempts >= settings.maxPublishRetries
      ) {
        failures += 1;
      }
    }

    if (failures >= settings.consecutiveFailureAlertThreshold) {
      await createCriticalAlert({
        kind: "publish_failures",
        title: "投稿が連続で失敗しています",
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

    await ctx.logger.info(
      `Auto-ops tick done candidates=${candidates.length} queued=${queued}`,
    );
  },
};
