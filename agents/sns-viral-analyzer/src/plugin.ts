import type { AgentPlugin } from "@ai-base/agents-sdk";
import {
  EventTypes,
  createEvent,
  parseEvent,
  SnsPatternsAnalyzeRequestedDataSchema,
  SnsTrendObservedDataSchema,
} from "@ai-base/events";
import { extractViralPatterns, type SnsLocale, type SnsPlatform } from "@ai-base/sns-learning";

export const snsViralAnalyzerPlugin: AgentPlugin = {
  manifest: {
    key: "sns-viral-analyzer",
    version: "0.1.0",
    displayName: {
      en: "SNS Viral Pattern Analyzer",
      ja: "SNSバイラルパターン分析",
    },
    subscribe: [
      EventTypes.SnsPatternsAnalyzeRequested,
      EventTypes.SnsTrendObserved,
    ],
    publish: [
      EventTypes.SnsPatternsReady,
      EventTypes.SnsExperimentPlanRequested,
      EventTypes.SnsRecommendRequested,
    ],
    capabilities: ["pattern_extraction", "no_content_copy"],
  },
  async handle(ctx, event) {
    if (event.type === EventTypes.SnsTrendObserved) {
      parseEvent(event, SnsTrendObservedDataSchema);
    } else {
      parseEvent(event, SnsPatternsAnalyzeRequestedDataSchema);
    }

    const observations = await ctx.repos.snsLearning.listObservations({
      status: "active",
    });
    const drafts = extractViralPatterns(
      observations.map((o) => ({
        id: o.id,
        platform: o.platform as SnsPlatform,
        locale: o.locale as SnsLocale,
        category: o.category,
        theme: o.theme,
        hookPattern: o.hookPattern,
        durationSec: o.durationSec,
        captionDensity: o.captionDensity,
        subtitleStructure: o.subtitleStructure,
        sceneFlow: o.sceneFlow,
        format: o.format,
        ctaPattern: o.ctaPattern,
        hashtagPatterns: o.hashtagPatterns,
        postedAtHour: o.postedAtHour,
        commentTendency: o.commentTendency,
        plays: o.plays,
        likes: o.likes,
        saves: o.saves,
        shares: o.shares,
        comments: o.comments,
        whyItMayWork: Array.isArray(o.whyItMayWork)
          ? (o.whyItMayWork as string[])
          : [],
        sourceType: o.sourceType as "official_api" | "operator_import" | "seed_structure",
        sourceRef: o.sourceRef,
        confidence: o.confidence,
        observedAt: o.observedAt,
      })),
    );

    const patternIds: string[] = [];
    for (const draft of drafts) {
      const row = await ctx.repos.snsLearning.createPattern({
        platform: draft.platform,
        locale: draft.locale,
        category: draft.category,
        patternType: draft.patternType,
        title: draft.title,
        summary: draft.summary,
        structure: draft.structure,
        analysisPeriodStart: draft.analysisPeriodStart,
        analysisPeriodEnd: draft.analysisPeriodEnd,
        sampleSize: draft.sampleSize,
        confidence: draft.confidence,
        evidence: draft.evidence,
        validUntil: draft.validUntil,
      });
      patternIds.push(row.id);
    }

    await ctx.repos.snsLearning.logImprovement({
      agentKey: ctx.agentKey,
      summary: `Extracted ${patternIds.length} viral structure patterns`,
      toState: { patternIds },
    });

    await ctx.knowledge.memory.recordImprovement({
      agentKey: ctx.agentKey,
      title: "SNS viral patterns refreshed",
      content: `Created ${patternIds.length} patterns. Confidence remains provisional without own-post metrics.`,
      correlationId: ctx.correlationId,
      metadata: { patternIds },
    });

    await ctx.publish(
      createEvent({
        type: EventTypes.SnsPatternsReady,
        source: "agent:sns-viral-analyzer",
        dataschema: "https://ai-base.local/schemas/sns.patterns.ready.v1.json",
        correlationid: ctx.correlationId,
        causationid: event.id,
        data: { patternIds, count: patternIds.length },
      }),
    );
    await ctx.publish(
      createEvent({
        type: EventTypes.SnsExperimentPlanRequested,
        source: "agent:sns-viral-analyzer",
        dataschema:
          "https://ai-base.local/schemas/sns.experiment.plan.requested.v1.json",
        correlationid: ctx.correlationId,
        causationid: event.id,
        data: {},
      }),
    );
    await ctx.publish(
      createEvent({
        type: EventTypes.SnsRecommendRequested,
        source: "agent:sns-viral-analyzer",
        dataschema:
          "https://ai-base.local/schemas/sns.recommend.requested.v1.json",
        correlationid: ctx.correlationId,
        causationid: event.id,
        data: { limit: 6 },
      }),
    );
  },
};
