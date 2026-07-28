import type { AgentPlugin } from "@ai-base/agents-sdk";
import {
  EventTypes,
  createEvent,
  parseEvent,
  SnsFeedbackTickDataSchema,
  SnsMetricsIngestRequestedDataSchema,
} from "@ai-base/events";
import {
  assertNoFabricatedMetrics,
  classifyOwnPostOutcome,
  decayWeight,
} from "@ai-base/sns-learning";

/**
 * Records own-post metrics only. Never invents numbers.
 * Writes learning records with time decay metadata.
 */
export const snsPerformancePlugin: AgentPlugin = {
  manifest: {
    key: "sns-performance",
    version: "0.1.0",
    displayName: {
      en: "SNS Performance Analytics",
      ja: "SNSパフォーマンス分析",
    },
    subscribe: [EventTypes.SnsFeedbackTick, EventTypes.SnsMetricsIngestRequested],
    publish: [EventTypes.SnsLearningUpdated, EventTypes.SnsRecommendRequested],
    capabilities: ["own_post_metrics", "learning_memory", "no_fabricated_stats"],
  },
  async handle(ctx, event) {
    if (event.type === EventTypes.SnsMetricsIngestRequested) {
      const data = parseEvent(event, SnsMetricsIngestRequestedDataSchema).data;
      assertNoFabricatedMetrics(data.metrics);
      await ctx.repos.snsLearning.createMetrics({
        socialPost: { connect: { id: data.socialPostId } },
        windowHours: data.windowHours,
        source: data.source,
        plays: num(data.metrics.plays),
        reach: num(data.metrics.reach),
        avgWatchSec: num(data.metrics.avgWatchSec),
        completionRate: num(data.metrics.completionRate),
        hold3SecRate: num(data.metrics.hold3SecRate),
        likeRate: num(data.metrics.likeRate),
        commentRate: num(data.metrics.commentRate),
        saveRate: num(data.metrics.saveRate),
        shareRate: num(data.metrics.shareRate),
        profileVisitRate: num(data.metrics.profileVisitRate),
        linkClickRate: num(data.metrics.linkClickRate),
        followRate: num(data.metrics.followRate),
        affiliateClicks: num(data.metrics.affiliateClicks),
        conversions: num(data.metrics.conversions),
        revenue: num(data.metrics.revenue),
      });
      await learnFromPost(ctx, data.socialPostId, event.id);
      return;
    }

    const tick = parseEvent(event, SnsFeedbackTickDataSchema).data;
    const posts = tick.socialPostId
      ? [await ctx.repos.socialPosts.findById(tick.socialPostId)].filter(Boolean)
      : await ctx.repos.socialPosts.listPublishedForFeedback(tick.windowHours);

    const learningIds: string[] = [];
    for (const post of posts) {
      if (!post) continue;
      const existing = post.metrics?.find((m) => m.windowHours === tick.windowHours);
      if (!existing) {
        await ctx.logger.info(
          "Feedback tick: no real metrics yet — skipping fabrication",
          { socialPostId: post.id, windowHours: tick.windowHours },
        );
        continue;
      }
      const ids = await learnFromPost(ctx, post.id, event.id);
      learningIds.push(...ids);
    }

    await ctx.publish(
      createEvent({
        type: EventTypes.SnsLearningUpdated,
        source: "agent:sns-performance",
        dataschema: "https://ai-base.local/schemas/sns.learning.updated.v1.json",
        correlationid: ctx.correlationId,
        causationid: event.id,
        data: { learningRecordIds: learningIds },
      }),
    );
    await ctx.publish(
      createEvent({
        type: EventTypes.SnsRecommendRequested,
        source: "agent:sns-performance",
        dataschema:
          "https://ai-base.local/schemas/sns.recommend.requested.v1.json",
        correlationid: ctx.correlationId,
        causationid: event.id,
        data: { limit: 6 },
      }),
    );
  },
};

function num(v: number | null | undefined): number | null {
  return typeof v === "number" ? v : null;
}

async function learnFromPost(
  ctx: Parameters<AgentPlugin["handle"]>[0],
  socialPostId: string,
  causationId: string,
): Promise<string[]> {
  const post = await ctx.repos.socialPosts.findById(socialPostId);
  if (!post) return [];
  const latest = post.metrics[0];
  if (!latest) return [];

  const outcome = classifyOwnPostOutcome({
    plays: latest.plays,
    affiliateClicks: latest.affiliateClicks,
    conversions: latest.conversions,
    revenue: latest.revenue,
    saveRate: latest.saveRate,
  });

  const ageDays =
    (Date.now() - (post.publishedAt?.getTime() ?? post.createdAt.getTime())) /
    (24 * 60 * 60 * 1000);
  const halfLife = 21;
  const weight = decayWeight(ageDays, halfLife);

  const record = await ctx.repos.snsLearning.createLearning({
    kind: outcome.kind,
    platform: post.platform,
    locale: post.locale,
    theme: post.theme,
    hookType: post.hookType,
    ctaType: post.cta,
    title: outcome.title,
    content: [
      `Own post ${post.id} on ${post.platform}/${post.locale}.`,
      `Theme=${post.theme ?? "n/a"} hook=${post.hookType ?? "n/a"} cta=${post.cta ?? "n/a"}.`,
      `Latest metrics window=${latest.windowHours}h source=${latest.source}.`,
      `Decay weight=${weight.toFixed(3)} (half-life ${halfLife}d).`,
      "Own-post outcomes outrank third-party structure seeds.",
    ].join(" "),
    metadata: {
      socialPostId: post.id,
      metricsId: latest.id,
      decayWeight: weight,
      causationId,
    },
    evidencePostIds: [post.id],
    importance: outcome.kind === "success_pattern" ? 0.9 : 0.7,
    decayHalfLifeDays: halfLife,
    observedAt: latest.capturedAt,
  });

  await ctx.knowledge.memory.remember({
    kind: "feedback",
    agentKey: ctx.agentKey,
    title: outcome.title,
    content: record.content,
    scope: "global",
    toolId: post.toolId ?? undefined,
    correlationId: ctx.correlationId,
    metadata: { learningRecordId: record.id, kind: outcome.kind },
    importance: record.importance * weight,
  });

  await ctx.repos.snsLearning.logImprovement({
    agentKey: ctx.agentKey,
    summary: `Learning from own post: ${outcome.kind}`,
    fromState: { socialPostId },
    toState: { learningRecordId: record.id, weight },
  });

  return [record.id];
}
