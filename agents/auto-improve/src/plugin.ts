import type { AgentPlugin } from "@ai-base/agents-sdk";
import {
  applyArticleImprovement,
  findImproveCandidates,
} from "@ai-base/company-ops";
import {
  ContentImproveRequestedDataSchema,
  EventTypes,
  createEvent,
  parseEvent,
} from "@ai-base/events";

export const autoImprovePlugin: AgentPlugin = {
  manifest: {
    key: "auto-improve",
    version: "0.1.0",
    displayName: { en: "Auto Improve", ja: "自動改善" },
    subscribe: [EventTypes.ContentImproveRequested],
    publish: [EventTypes.ContentImproved],
    capabilities: ["ctr_fix", "ranking_fix", "cta_fix", "copy_rewrite"],
  },

  async handle(ctx, event) {
    if (event.type !== EventTypes.ContentImproveRequested) return;
    parseEvent(event, ContentImproveRequestedDataSchema);

    const candidates = await findImproveCandidates();
    let improved = 0;
    for (const c of candidates) {
      if (c.targetType === "article") {
        await applyArticleImprovement(c.targetId, c.reason);
        improved += 1;
      }
      await ctx.publish(
        createEvent({
          type: EventTypes.ContentImproved,
          source: "agent:auto-improve",
          dataschema: "https://ai-base.local/schemas/content.improved.v1.json",
          correlationid: event.correlationid,
          causationid: event.id,
          data: {
            targetType: c.targetType,
            targetId: c.targetId,
            changes: c.suggestedChanges,
          },
        }),
      );
    }

    await ctx.logger.info(`Auto-improve scanned=${candidates.length} applied=${improved}`);
  },
};
