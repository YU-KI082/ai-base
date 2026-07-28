import type { AgentPlugin } from "@ai-base/agents-sdk";
import {
  EventTypes,
  parseEvent,
  ContentPublishedDataSchema,
} from "@ai-base/events";

export const socialPlugin: AgentPlugin = {
  manifest: {
    key: "social",
    version: "0.1.0",
    displayName: { en: "Social Agent", ja: "ソーシャルエージェント" },
    subscribe: [EventTypes.ContentPublished],
    publish: [],
    capabilities: ["tiktok", "instagram", "threads", "x", "youtube_shorts"],
  },
  async handle(ctx, event) {
    const data = parseEvent(event, ContentPublishedDataSchema).data;
    const platforms = ["x", "threads", "instagram", "tiktok", "youtube_shorts"];
    for (const platform of platforms) {
      for (const locale of ["en", "ja"] as const) {
        await ctx.db.socialPost.create({
          data: {
            platform,
            locale,
            status: "draft",
            toolId: data.toolId,
            content:
              locale === "en"
                ? `New on AI BASE: ${data.slug} — discover, compare, adopt.`
                : `AI BASEに新着: ${data.slug} — 発見・比較・導入を支援します。`,
          },
        });
      }
    }
    await ctx.logger.info("social drafts created", {
      toolId: data.toolId,
      platforms,
    });
  },
};
