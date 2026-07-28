import type { AgentPlugin } from "@ai-base/agents-sdk";
import {
  EventTypes,
  parseEvent,
  ContentPublishedDataSchema,
} from "@ai-base/events";

export const analyticsPlugin: AgentPlugin = {
  manifest: {
    key: "analytics",
    version: "0.1.0",
    displayName: { en: "Analytics", ja: "アナリティクス" },
    subscribe: [EventTypes.ContentPublished],
    publish: [],
    capabilities: ["pv", "ctr", "cvr", "revenue", "rankings"],
  },
  async handle(ctx, event) {
    const data = parseEvent(event, ContentPublishedDataSchema).data;
    await ctx.db.analyticsEvent.create({
      data: {
        name: "content.published",
        properties: {
          toolId: data.toolId,
          slug: data.slug,
          draftId: data.draftId,
          workflowId: data.workflowId,
        },
      },
    });
    await ctx.logger.info("analytics event recorded", { toolId: data.toolId });
  },
};
