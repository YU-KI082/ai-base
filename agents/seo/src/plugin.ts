import type { AgentPlugin } from "@ai-base/agents-sdk";
import {
  createEvent,
  EventTypes,
  parseEvent,
  ContentAssetsReadyDataSchema,
  ContentTranslatedDataSchema,
  ContentSeoReadyDataSchema,
  ContentPendingApprovalDataSchema,
} from "@ai-base/events";

async function maybeFinalizeSeo(
  ctx: Parameters<AgentPlugin["handle"]>[0],
  draftId: string,
  workflowId: string,
  causationId: string,
  correlationId: string,
) {
  const draft = await ctx.repos.drafts.findById(draftId);
  if (!draft) throw new Error("draft not found");
  const payload = draft.payload as {
    assetsReady?: boolean;
    translationReady?: boolean;
    seoReady?: boolean;
    slug?: string;
    locales?: {
      en?: { name?: string; description?: string };
      ja?: { name?: string; description?: string };
    };
    seo?: Record<string, unknown>;
    [key: string]: unknown;
  };

  if (!payload.assetsReady || !payload.translationReady) {
    await ctx.logger.info("seo barrier waiting", {
      assetsReady: payload.assetsReady ?? false,
      translationReady: payload.translationReady ?? false,
    });
    return;
  }
  if (payload.seoReady) return;

  const claimed = await ctx.repos.consumptions.tryClaim(
    "seo-finalize",
    `draft:${draftId}`,
  );
  if (!claimed) {
    await ctx.logger.info("seo finalize already claimed", { draftId });
    return;
  }

  await ctx.repos.workflows.markStep(workflowId, "seo", "running");

  const en = payload.locales?.en;
  const ja = payload.locales?.ja;
  payload.seo = {
    en: {
      title: `${en?.name ?? payload.slug} — AI Tool Review | AI BASE`,
      description:
        en?.description?.slice(0, 155) ??
        "Discover and compare AI tools on AI BASE.",
      faq: [
        {
          q: `What is ${en?.name}?`,
          a: en?.description ?? "",
        },
        {
          q: `Is ${en?.name} free?`,
          a: "Pricing depends on the vendor plan. Check the official site.",
        },
      ],
      schema: {
        "@type": "SoftwareApplication",
        name: en?.name,
        url: payload.homepageUrl,
      },
    },
    ja: {
      title: `${ja?.name ?? payload.slug} — AIツールレビュー | AI BASE`,
      description:
        ja?.description?.slice(0, 155) ??
        "AI BASEでAIツールを発見・比較。",
      faq: [
        {
          q: `${ja?.name}とは？`,
          a: ja?.description ?? "",
        },
        {
          q: `${ja?.name}は無料ですか？`,
          a: "料金は提供元プランによります。公式サイトをご確認ください。",
        },
      ],
      schema: {
        "@type": "SoftwareApplication",
        name: ja?.name,
        url: payload.homepageUrl,
      },
    },
    internalLinks: ["/", "/categories", "/compare"],
  };
  payload.seoReady = true;

  await ctx.repos.drafts.mergePayload(draft.id, {
    seo: payload.seo,
    seoReady: true,
  });
  await ctx.repos.drafts.setStatus(draft.id, "pending_approval");

  const seoReady = createEvent({
    type: EventTypes.ContentSeoReady,
    source: "agent:seo",
    dataschema: "https://ai-base.local/schemas/content.seo.ready.v1.json",
    correlationid: correlationId,
    causationid: causationId,
    subject: draft.id,
    data: { draftId: draft.id, workflowId },
  });
  parseEvent(seoReady, ContentSeoReadyDataSchema);
  await ctx.publish(seoReady);

  const pending = createEvent({
    type: EventTypes.ContentPendingApproval,
    source: "agent:seo",
    dataschema:
      "https://ai-base.local/schemas/content.pending_approval.v1.json",
    correlationid: correlationId,
    causationid: causationId,
    subject: draft.id,
    data: { draftId: draft.id, workflowId },
  });
  parseEvent(pending, ContentPendingApprovalDataSchema);
  await ctx.publish(pending);

  await ctx.repos.workflows.markStep(workflowId, "seo", "completed");
  await ctx.repos.workflows.setState(workflowId, "pending_approval");
}

export const seoPlugin: AgentPlugin = {
  manifest: {
    key: "seo",
    version: "0.1.0",
    displayName: { en: "SEO Agent", ja: "SEOエージェント" },
    subscribe: [EventTypes.ContentAssetsReady, EventTypes.ContentTranslated],
    publish: [EventTypes.ContentSeoReady, EventTypes.ContentPendingApproval],
    capabilities: ["title", "meta", "faq", "schema", "internal_links"],
  },
  async handle(ctx, event) {
    if (event.type === EventTypes.ContentAssetsReady) {
      const data = parseEvent(event, ContentAssetsReadyDataSchema).data;
      await maybeFinalizeSeo(
        ctx,
        data.draftId,
        data.workflowId,
        event.id,
        event.correlationid,
      );
      return;
    }
    const data = parseEvent(event, ContentTranslatedDataSchema).data;
    await maybeFinalizeSeo(
      ctx,
      data.draftId,
      data.workflowId,
      event.id,
      event.correlationid,
    );
  },
};
