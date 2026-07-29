import type { AgentPlugin } from "@ai-base/agents-sdk";
import { predictRisingAi } from "@ai-base/company-ops";
import {
  EventTypes,
  TrendPredictRequestedDataSchema,
  createEvent,
  parseEvent,
} from "@ai-base/events";

export const trendPredictPlugin: AgentPlugin = {
  manifest: {
    key: "trend-predict",
    version: "0.1.0",
    displayName: { en: "Trend Prediction", ja: "トレンド予測" },
    subscribe: [EventTypes.TrendPredictRequested],
    publish: [
      EventTypes.TrendPredictionsReady,
      EventTypes.IngestManualRequested,
      EventTypes.ArticleGenerateRequested,
    ],
    capabilities: ["trend_forecast", "priority_content"],
  },

  async handle(ctx, event) {
    if (event.type !== EventTypes.TrendPredictRequested) return;
    const data = parseEvent(event, TrendPredictRequestedDataSchema).data;
    const predictions = await predictRisingAi(data.limit);

    await ctx.publish(
      createEvent({
        type: EventTypes.TrendPredictionsReady,
        source: "agent:trend-predict",
        dataschema: "https://ai-base.local/schemas/trend.predictions.ready.v1.json",
        correlationid: event.correlationid,
        causationid: event.id,
        data: { predictions },
      }),
    );

    // Prioritize top prediction for ingest + article
    const top = predictions[0];
    if (top?.homepageUrl) {
      await ctx.publish(
        createEvent({
          type: EventTypes.IngestManualRequested,
          source: "agent:trend-predict",
          dataschema:
            "https://ai-base.local/schemas/ingest.manual.requested.v1.json",
          correlationid: event.correlationid,
          causationid: event.id,
          data: {
            name: top.name,
            homepageUrl: top.homepageUrl,
            sourceName: `trend:${top.source}`,
            description: top.rationale,
            categoryHints: ["trending"],
            externalId: `trend:${top.name}:${new Date().toISOString().slice(0, 10)}`,
          },
        }),
      );
      await ctx.publish(
        createEvent({
          type: EventTypes.ArticleGenerateRequested,
          source: "agent:trend-predict",
          dataschema:
            "https://ai-base.local/schemas/content.article.generate.requested.v1.json",
          correlationid: event.correlationid,
          causationid: event.id,
          data: {
            kind: "news" as const,
            topic: top.name,
            toolSlugs: [],
            locale: "ja" as const,
            autoPublish: true,
          },
        }),
      );
    }

    await ctx.logger.info(`Trend predictions ready top=${top?.name ?? "none"}`);
  },
};
