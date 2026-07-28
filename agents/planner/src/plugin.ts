import type { AgentPlugin } from "@ai-base/agents-sdk";
import {
  EventTypes,
  parseEvent,
  ContentPublishedDataSchema,
  ToolReviewedDataSchema,
} from "@ai-base/events";

export const plannerPlugin: AgentPlugin = {
  manifest: {
    key: "planner",
    version: "0.1.0",
    displayName: { en: "Planner", ja: "プランナー" },
    subscribe: [EventTypes.ContentPublished, EventTypes.ToolReviewed],
    publish: [],
    capabilities: ["topics", "affiliates", "editorial_calendar"],
  },
  async handle(ctx, event) {
    if (event.type === EventTypes.ToolReviewed) {
      const data = parseEvent(event, ToolReviewedDataSchema).data;
      if (data.passed) return;
      await ctx.db.analyticsEvent.create({
        data: {
          name: "planner.review_failed",
          properties: {
            candidateId: data.candidateId,
            reasons: data.reasons,
          },
        },
      });
      await ctx.logger.info("planner noted failed review", {
        reasons: data.reasons,
      });
      return;
    }

    const data = parseEvent(event, ContentPublishedDataSchema).data;
    await ctx.db.analyticsEvent.create({
      data: {
        name: "planner.recommend",
        properties: {
          recommendations: [
            {
              type: "comparison",
              seedSlug: data.slug,
              locales: ["en", "ja"],
            },
            {
              type: "seo_article",
              topic: `best alternatives to ${data.slug}`,
              locales: ["en", "ja"],
            },
          ],
        },
      },
    });
    await ctx.logger.info("planner recommendations queued", {
      slug: data.slug,
    });
  },
};
