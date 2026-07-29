import type { AgentPlugin } from "@ai-base/agents-sdk";
import {
  EventTypes,
  ResearchScoutRequestedDataSchema,
  createEvent,
  parseEvent,
} from "@ai-base/events";
import { discoverFromSources } from "@ai-base/scout-sources";

/**
 * AI Research Agent — discovers new AI tools from PH / HF / GitHub / blogs / Reddit.
 * Emits ingest.manual.requested.v1 so the existing scout→review→write pipeline runs.
 */
export const researchPlugin: AgentPlugin = {
  manifest: {
    key: "research",
    version: "0.1.0",
    displayName: { en: "AI Research", ja: "AIリサーチ" },
    subscribe: [EventTypes.ResearchScoutRequested],
    publish: [
      EventTypes.IngestManualRequested,
      EventTypes.ResearchToolsDiscovered,
    ],
    capabilities: [
      "research_sources",
      "tool_discovery",
      "product_hunt",
      "huggingface",
      "github",
    ],
  },

  async handle(ctx, event) {
    if (event.type !== EventTypes.ResearchScoutRequested) return;
    const data = parseEvent(event, ResearchScoutRequestedDataSchema).data;
    const found = await discoverFromSources({
      sources: data.sources,
      limit: data.limit,
    });

    let emitted = 0;
    for (const tool of found) {
      await ctx.publish(
        createEvent({
          type: EventTypes.IngestManualRequested,
          source: "agent:research",
          dataschema:
            "https://ai-base.local/schemas/ingest.manual.requested.v1.json",
          correlationid: event.correlationid,
          causationid: event.id,
          data: {
            name: tool.name,
            homepageUrl: tool.homepageUrl,
            sourceName: tool.sourceName,
            sourceUrl: tool.sourceUrl,
            externalId: tool.externalId,
            description: tool.description,
            categoryHints: tool.categoryHints ?? [],
            raw: tool.raw ?? { researchedAt: new Date().toISOString() },
          },
        }),
      );
      emitted += 1;
    }

    await ctx.publish(
      createEvent({
        type: EventTypes.ResearchToolsDiscovered,
        source: "agent:research",
        dataschema:
          "https://ai-base.local/schemas/research.tools.discovered.v1.json",
        correlationid: event.correlationid,
        causationid: event.id,
        data: {
          count: emitted,
          toolNames: found.map((f) => f.name),
          source: (data.sources ?? []).join(",") || "all",
        },
      }),
    );

    await ctx.logger.info(`Research discovered ${emitted} tools`);
  },
};
