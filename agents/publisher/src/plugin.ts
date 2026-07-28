import type { AgentPlugin } from "@ai-base/agents-sdk";
import {
  createEvent,
  EventTypes,
  parseEvent,
  ContentApprovedDataSchema,
  ContentPublishedDataSchema,
} from "@ai-base/events";
import type { Locale } from "@ai-base/database";

type DraftPayload = {
  slug: string;
  homepageUrl: string;
  sourceName?: string;
  sourceUrl?: string | null;
  externalId?: string | null;
  categoryKeys?: string[];
  pricingModel?: "free" | "freemium" | "paid" | "enterprise" | "unknown";
  hasFreePlan?: boolean;
  hasApi?: boolean;
  locales: Record<
    string,
    {
      name: string;
      description: string;
      features?: string[];
      pros?: string[];
      cons?: string[];
      languageSupport?: string[];
    }
  >;
  media?: Array<{
    type: "screenshot" | "video" | "logo" | "ogp" | "thumbnail";
    url: string;
    alt?: string;
  }>;
  seo?: Record<
    string,
    {
      title?: string;
      description?: string;
      faq?: unknown;
      schema?: unknown;
    }
  >;
};

export const publisherPlugin: AgentPlugin = {
  manifest: {
    key: "publisher",
    version: "0.1.0",
    displayName: { en: "Publisher", ja: "パブリッシャー" },
    description: {
      en: "Publishes approved drafts to public tables and the Knowledge Layer.",
      ja: "承認済み下書きを公開テーブルとナレッジレイヤーへ反映します。",
    },
    subscribe: [EventTypes.ContentApproved],
    publish: [EventTypes.ContentPublished],
    capabilities: ["publish"],
    permissions: ["tools.publish", "knowledge.write"],
    dependencies: [{ key: "seo", versionRange: "^0.1.0", optional: true }],
    marketplace: {
      visibility: "internal",
      listingStatus: "published",
      tags: ["builtin", "publish"],
    },
  },
  async handle(ctx, event) {
    const data = parseEvent(event, ContentApprovedDataSchema).data;
    await ctx.repos.workflows.markStep(data.workflowId, "publisher", "running");
    await ctx.repos.workflows.markStep(data.workflowId, "approval", "completed");

    const draft = await ctx.repos.drafts.findById(data.draftId);
    if (!draft) throw new Error("draft not found");
    if (draft.status !== "approved") {
      throw new Error(`draft status must be approved, got ${draft.status}`);
    }

    const payload = draft.payload as DraftPayload;
    const translations = (["en", "ja"] as Locale[]).map((locale) => {
      const block = payload.locales[locale];
      if (!block) throw new Error(`missing locale ${locale}`);
      const seo = payload.seo?.[locale];
      return {
        locale,
        name: block.name,
        description: block.description,
        features: block.features ?? [],
        pros: block.pros ?? [],
        cons: block.cons ?? [],
        languageSupport: block.languageSupport ?? [],
        seoTitle: seo?.title,
        seoDescription: seo?.description,
        faq: seo?.faq ?? [],
        schemaJson: seo?.schema,
      };
    });

    const tool = await ctx.repos.tools.publishFromDraft({
      slug: payload.slug,
      homepageUrl: payload.homepageUrl,
      logoUrl: payload.media?.find((m) => m.type === "logo")?.url,
      pricingModel: payload.pricingModel ?? "unknown",
      hasFreePlan: payload.hasFreePlan ?? false,
      hasApi: payload.hasApi ?? false,
      sourceName: payload.sourceName,
      sourceUrl: payload.sourceUrl ?? undefined,
      externalId: payload.externalId ?? undefined,
      categoryKeys: payload.categoryKeys ?? [],
      translations,
      media: payload.media,
    });

    await ctx.repos.drafts.setStatus(draft.id, "published");
    await ctx.db.draft.update({
      where: { id: draft.id },
      data: { toolId: tool.id },
    });

    const en = payload.locales.en;
    await ctx.knowledge.graph.upsertToolGraph({
      toolId: tool.id,
      slug: tool.slug,
      name: en?.name ?? tool.slug,
      description: en?.description,
      categoryKeys: payload.categoryKeys ?? [],
      pricingKey: payload.pricingModel ?? "unknown",
      hasApi: payload.hasApi ?? false,
      useCases: (en?.features ?? []).slice(0, 5),
    });

    await ctx.knowledge.rag.ingestDocument({
      title: en?.name ?? tool.slug,
      content: [
        en?.description ?? "",
        ...(en?.features ?? []),
        jaBlock(payload),
      ]
        .filter(Boolean)
        .join("\n\n"),
      sourceType: "tool_page",
      sourceId: tool.id,
      locale: "en",
      metadata: { slug: tool.slug },
    });

    await ctx.knowledge.memory.recordImprovement({
      agentKey: "publisher",
      title: `Published ${tool.slug}`,
      content: `Tool ${tool.slug} entered the shared knowledge graph and RAG index.`,
      correlationId: event.correlationid,
      metadata: { toolId: tool.id, slug: tool.slug },
    });

    const outgoing = createEvent({
      type: EventTypes.ContentPublished,
      source: "agent:publisher",
      dataschema: "https://ai-base.local/schemas/content.published.v1.json",
      correlationid: event.correlationid,
      causationid: event.id,
      subject: tool.id,
      data: {
        draftId: draft.id,
        workflowId: data.workflowId,
        toolId: tool.id,
        slug: tool.slug,
      },
    });
    parseEvent(outgoing, ContentPublishedDataSchema);
    await ctx.publish(outgoing);

    await ctx.repos.workflows.markStep(data.workflowId, "publisher", "completed");
    await ctx.repos.workflows.setState(data.workflowId, "published");
  },
};

function jaBlock(payload: DraftPayload): string {
  const ja = payload.locales.ja;
  if (!ja) return "";
  return [ja.name, ja.description, ...(ja.features ?? [])].filter(Boolean).join("\n");
}
