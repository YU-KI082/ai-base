import type { AgentPlugin } from "@ai-base/agents-sdk";
import { proposeAspInvestigations } from "@ai-base/affiliate-intel";
import {
  AffiliateIntelRequestedDataSchema,
  ContentPublishedDataSchema,
  EventTypes,
  createEvent,
  parseEvent,
} from "@ai-base/events";
import type { AgentContext } from "@ai-base/agents-sdk";

async function registerTool(
  ctx: AgentContext,
  causationId: string,
  toolId: string,
  homepageUrl: string | null | undefined,
) {
  const proposals = proposeAspInvestigations();
  const row = await ctx.repos.affiliateIntel.ensureForTool({
    toolId,
    homepageUrl,
    leads: proposals.map((p) => ({
      aspKey: p.aspKey,
      aspLabel: p.aspLabel,
      status: p.status,
      notes: p.notes,
      proposedBy: "agent",
    })),
  });

  await ctx.knowledge.memory.remember({
    kind: "observation",
    agentKey: ctx.agentKey,
    title: "Affiliate unconfirmed case registered",
    content: `Tool ${toolId} marked アフィリエイト未確認 with ${proposals.length} ASP investigation proposals.`,
    scope: "tool",
    toolId,
    correlationId: ctx.correlationId,
    metadata: { intelligenceId: row.id, status: row.status },
    importance: 0.55,
  });

  await ctx.publish(
    createEvent({
      type: EventTypes.AffiliateIntelRegistered,
      source: "agent:affiliate",
      dataschema:
        "https://ai-base.local/schemas/affiliate.intel.registered.v1.json",
      correlationid: ctx.correlationId,
      causationid: causationId,
      data: {
        toolId,
        intelligenceId: row.id,
        leadCount: row.leads?.length ?? proposals.length,
        status: row.status,
      },
    }),
  );

  await ctx.logger.info("affiliate intelligence registered", {
    toolId,
    intelligenceId: row.id,
    status: row.status,
  });
}

/**
 * On new published tools: register Affiliate Intelligence as 未確認
 * and propose ASP investigation targets (公式 / A8 / もしも / AT / VC).
 */
export const affiliatePlugin: AgentPlugin = {
  manifest: {
    key: "affiliate",
    version: "0.1.0",
    displayName: {
      en: "Affiliate Intelligence",
      ja: "アフィリエイトインテリジェンス",
    },
    subscribe: [
      EventTypes.ContentPublished,
      EventTypes.AffiliateIntelRequested,
    ],
    publish: [EventTypes.AffiliateIntelRegistered],
    capabilities: [
      "affiliate_case",
      "asp_proposals",
      "official",
      "a8",
      "moshimo",
      "accesstrade",
      "valuecommerce",
    ],
  },
  async handle(ctx, event) {
    if (event.type === EventTypes.AffiliateIntelRequested) {
      const data = parseEvent(event, AffiliateIntelRequestedDataSchema).data;
      if (data.backfillAll) {
        const tools = await ctx.repos.tools.findPublished("en", { take: 500 });
        for (const tool of tools) {
          await registerTool(ctx, event.id, tool.id, tool.homepageUrl);
        }
        return;
      }
      if (data.toolId) {
        const tool = await ctx.db.aiTool.findUnique({
          where: { id: data.toolId },
        });
        if (!tool) throw new Error("tool not found");
        await registerTool(ctx, event.id, tool.id, tool.homepageUrl);
      }
      return;
    }

    const published = parseEvent(event, ContentPublishedDataSchema).data;
    const tool = await ctx.db.aiTool.findUnique({
      where: { id: published.toolId },
    });
    await registerTool(ctx, event.id, published.toolId, tool?.homepageUrl ?? null);
  },
};
