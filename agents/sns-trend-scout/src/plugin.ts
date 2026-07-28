import type { AgentPlugin } from "@ai-base/agents-sdk";
import {
  EventTypes,
  createEvent,
  parseEvent,
  SnsTrendScoutRequestedDataSchema,
} from "@ai-base/events";
import {
  disconnectedOfficialProviders,
  seedStructureObservations,
  type TrendObservationInput,
} from "@ai-base/sns-learning";

/**
 * Collects structure-only trend signals.
 * Official APIs return empty until connected — never scrapes.
 */
export const snsTrendScoutPlugin: AgentPlugin = {
  manifest: {
    key: "sns-trend-scout",
    version: "0.1.0",
    displayName: {
      en: "SNS Trend Scout",
      ja: "SNSトレンドスカウト",
    },
    subscribe: [EventTypes.SnsTrendScoutRequested],
    publish: [EventTypes.SnsTrendObserved, EventTypes.SnsPatternsAnalyzeRequested],
    capabilities: ["instagram", "tiktok", "structure_trends", "no_scraping"],
  },
  async handle(ctx, event) {
    const data = parseEvent(event, SnsTrendScoutRequestedDataSchema).data;
    const collected: TrendObservationInput[] = [];

    for (const platform of data.platforms) {
      for (const locale of data.locales) {
        for (const provider of disconnectedOfficialProviders) {
          const rows = await provider.fetchStructureTrends({ platform, locale });
          collected.push(...rows);
        }
      }
    }

    if (data.useSeedCatalog && collected.length === 0) {
      collected.push(
        ...seedStructureObservations().filter(
          (o) =>
            data.platforms.includes(o.platform) &&
            data.locales.includes(o.locale),
        ),
      );
      await ctx.logger.info(
        "Official APIs disconnected — loaded structure seed catalog only (no engagement fabrications)",
        { count: collected.length },
      );
    }

    const ids: string[] = [];
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    for (const row of collected) {
      const created = await ctx.repos.snsLearning.createObservation({
        platform: row.platform,
        locale: row.locale,
        category: row.category ?? "ai_tools",
        theme: row.theme,
        hookPattern: row.hookPattern,
        durationSec: row.durationSec,
        captionDensity: row.captionDensity,
        subtitleStructure: row.subtitleStructure,
        sceneFlow: row.sceneFlow,
        format: row.format,
        ctaPattern: row.ctaPattern,
        hashtagPatterns: row.hashtagPatterns ?? [],
        postedAtHour: row.postedAtHour,
        commentTendency: row.commentTendency,
        plays: row.plays ?? null,
        likes: row.likes ?? null,
        saves: row.saves ?? null,
        shares: row.shares ?? null,
        comments: row.comments ?? null,
        whyItMayWork: row.whyItMayWork,
        sourceType: row.sourceType,
        sourceRef: row.sourceRef,
        confidence: row.confidence ?? 0.2,
        expiresAt,
      });
      ids.push(created.id);
    }

    await ctx.knowledge.memory.remember({
      kind: "observation",
      agentKey: ctx.agentKey,
      title: "SNS trend structure scout",
      content: `Stored ${ids.length} structure observations. Engagement fields null unless API-provided.`,
      scope: "global",
      correlationId: ctx.correlationId,
      metadata: { observationIds: ids },
      importance: 0.4,
    });

    await ctx.publish(
      createEvent({
        type: EventTypes.SnsTrendObserved,
        source: "agent:sns-trend-scout",
        dataschema: "https://ai-base.local/schemas/sns.trend.observed.v1.json",
        correlationid: ctx.correlationId,
        causationid: event.id,
        data: { observationIds: ids, count: ids.length },
      }),
    );
    await ctx.publish(
      createEvent({
        type: EventTypes.SnsPatternsAnalyzeRequested,
        source: "agent:sns-trend-scout",
        dataschema:
          "https://ai-base.local/schemas/sns.patterns.analyze.requested.v1.json",
        correlationid: ctx.correlationId,
        causationid: event.id,
        data: {},
      }),
    );
  },
};
