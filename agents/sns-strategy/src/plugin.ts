import type { AgentPlugin } from "@ai-base/agents-sdk";
import {
  EventTypes,
  createEvent,
  parseEvent,
  SnsPostScoreRequestedDataSchema,
  SnsRecommendRequestedDataSchema,
} from "@ai-base/events";
import {
  buildRecommendations,
  decayWeight,
  scoreSocialDraft,
  type SnsLocale,
  type SnsPlatform,
} from "@ai-base/sns-learning";

/**
 * Recommendation engine + pre-publish scoring.
 * Publish remains human-gated; high risk auto-returns to draft.
 */
export const snsStrategyPlugin: AgentPlugin = {
  manifest: {
    key: "sns-strategy",
    version: "0.1.0",
    displayName: {
      en: "SNS Strategy (Score + Recommend)",
      ja: "SNS戦略（採点・提案）",
    },
    subscribe: [
      EventTypes.SnsRecommendRequested,
      EventTypes.SnsPostScoreRequested,
      EventTypes.SnsLearningUpdated,
    ],
    publish: [EventTypes.SnsRecommendationsReady],
    capabilities: [
      "scoring",
      "recommendations",
      "risk_gate",
      "conversion_first",
    ],
  },
  async handle(ctx, event) {
    if (event.type === EventTypes.SnsPostScoreRequested) {
      const data = parseEvent(event, SnsPostScoreRequestedDataSchema).data;
      await scorePost(ctx, data.socialPostId);
      return;
    }

    if (event.type === EventTypes.SnsRecommendRequested) {
      parseEvent(event, SnsRecommendRequestedDataSchema);
    }

    const [patterns, learning, tools, affiliates] = await Promise.all([
      ctx.repos.snsLearning.listPatterns("active"),
      ctx.repos.snsLearning.listLearning({ status: "active" }),
      ctx.repos.tools.findPublished("en", { take: 20 }),
      ctx.repos.affiliates.list(),
    ]);

    const learningWeighted = learning.map((l) => {
      const ageDays =
        (Date.now() - l.observedAt.getTime()) / (24 * 60 * 60 * 1000);
      return {
        kind: l.kind,
        title: l.title,
        importance: l.importance,
        weight: decayWeight(ageDays, l.decayHalfLifeDays),
        platform: l.platform,
        locale: l.locale,
      };
    });

    const drafts = buildRecommendations({
      patterns: patterns.map((p) => ({
        platform: p.platform,
        locale: p.locale,
        title: p.title,
        summary: p.summary,
        confidence: p.confidence,
        structure:
          p.structure && typeof p.structure === "object"
            ? (p.structure as Record<string, unknown>)
            : {},
      })),
      learning: learningWeighted,
      tools: tools.map((t) => ({
        id: t.id,
        slug: t.slug,
        name: t.translations[0]?.name ?? t.slug,
      })),
      affiliates: affiliates.map((a) => ({ id: a.id, toolId: a.toolId })),
    });

    const recommendationIds: string[] = [];
    for (const draft of drafts) {
      const row = await ctx.repos.snsLearning.createRecommendation({
        theme: draft.theme,
        platform: draft.platform,
        locale: draft.locale,
        audience: draft.audience,
        recommendedHook: draft.recommendedHook,
        durationSec: draft.durationSec,
        postedAtHint: draft.postedAtHint,
        cta: draft.cta,
        toolId: draft.toolId,
        affiliateLinkId: draft.affiliateLinkId,
        goal: draft.goal,
        predictedScore: draft.predictedScore,
        rationale: draft.rationale,
        status: "proposed",
      });
      recommendationIds.push(row.id);

      // Auto-generate draft posts for human approval (not external publish)
      const content =
        draft.locale === "ja"
          ? [
              draft.recommendedHook,
              "",
              `テーマ: ${draft.theme}`,
              `尺目安: ${draft.durationSec}秒`,
              `CTA: ${draft.cta}`,
              draft.toolId ? `紹介ツールID: ${draft.toolId}` : "",
              "",
              "※他者投稿の複製禁止。構成のみ参考。公開は管理者承認必須。",
            ]
              .filter(Boolean)
              .join("\n")
          : [
              draft.recommendedHook,
              "",
              `Theme: ${draft.theme}`,
              `Duration target: ${draft.durationSec}s`,
              `CTA: ${draft.cta}`,
              draft.toolId ? `Tool: ${draft.toolId}` : "",
              "",
              "Do not copy third-party creative. Human approval required before publish.",
            ]
              .filter(Boolean)
              .join("\n");

      const post = await ctx.repos.socialPosts.createDraft({
        platform: draft.platform,
        locale: draft.locale,
        status: "draft",
        content,
        theme: draft.theme,
        hook: draft.recommendedHook,
        hookType: String(
          (patterns[0]?.structure as Record<string, unknown> | null)?.hookPattern ??
            "structure",
        ),
        durationSec: draft.durationSec,
        cta: draft.cta,
        toolId: draft.toolId,
        recommendation: { connect: { id: row.id } },
      });

      await scorePost(ctx, post.id);
    }

    await ctx.repos.snsLearning.logImprovement({
      agentKey: ctx.agentKey,
      summary: `Created ${recommendationIds.length} conversion-first recommendations + scored drafts`,
      toState: { recommendationIds },
    });

    await ctx.publish(
      createEvent({
        type: EventTypes.SnsRecommendationsReady,
        source: "agent:sns-strategy",
        dataschema:
          "https://ai-base.local/schemas/sns.recommendations.ready.v1.json",
        correlationid: ctx.correlationId,
        causationid: event.id,
        data: { recommendationIds },
      }),
    );
  },
};

async function scorePost(
  ctx: Parameters<AgentPlugin["handle"]>[0],
  socialPostId: string,
) {
  const post = await ctx.repos.socialPosts.findById(socialPostId);
  if (!post) return;

  const patterns = await ctx.repos.snsLearning.listPatterns("active");
  const avgConf =
    patterns.length > 0
      ? patterns.reduce((s, p) => s + p.confidence, 0) / patterns.length
      : 0.2;
  const learning = await ctx.repos.snsLearning.listLearning({ status: "active" });
  const learningWeight =
    learning.reduce((s, l) => {
      const age =
        (Date.now() - l.observedAt.getTime()) / (24 * 60 * 60 * 1000);
      return s + decayWeight(age, l.decayHalfLifeDays) * l.importance;
    }, 0) / Math.max(1, learning.length);

  const result = scoreSocialDraft({
    platform: (post.platform === "instagram" ? "instagram" : "tiktok") as SnsPlatform,
    locale: post.locale as SnsLocale,
    theme: post.theme,
    hook: post.hook,
    hookType: post.hookType,
    durationSec: post.durationSec,
    cta: post.cta,
    content: post.content,
    toolId: post.toolId,
    patternConfidenceAvg: avgConf,
    learningWeight,
  });

  await ctx.repos.snsLearning.createScore({
    socialPost: { connect: { id: post.id } },
    total: result.total,
    breakdown: result.breakdown,
    reasons: result.reasons,
    improvements: result.improvements,
    riskLevel: result.riskLevel,
    blocked: result.blocked,
  });

  await ctx.repos.socialPosts.applyScore(post.id, {
    scoreTotal: result.total,
    scoreBreakdown: result.breakdown,
    riskFlags: result.riskFlags,
    status: result.blocked
      ? "draft"
      : post.status === "ready"
        ? "draft"
        : post.status,
  });

  if (result.blocked) {
    await ctx.logger.warn("SNS draft auto-held for human approval (risk)", {
      socialPostId: post.id,
      riskFlags: result.riskFlags,
    });
  }
}
