import type { AgentPlugin } from "@ai-base/agents-sdk";
import { slugify } from "@ai-base/agents-sdk";
import type { Prisma } from "@ai-base/database";
import {
  createEvent,
  EventTypes,
  parseEvent,
  ToolReviewedDataSchema,
  ContentDraftGeneratedDataSchema,
  ContentRejectedDataSchema,
} from "@ai-base/events";

type LocaleContent = {
  name: string;
  description: string;
  features: string[];
  pros: string[];
  cons: string[];
  languageSupport: string[];
};

function buildFallbackContent(input: {
  name: string;
  description?: string;
  homepageUrl: string;
}): { en: LocaleContent; ja: LocaleContent } {
  const baseDescription =
    input.description?.trim() ||
    `${input.name} is an AI tool. Learn features, pricing, and use cases.`;
  return {
    en: {
      name: input.name,
      description: baseDescription,
      features: [
        "Core AI capabilities for everyday workflows",
        "Web-based access from the official homepage",
        "Suitable for individuals and teams evaluating AI tools",
      ],
      pros: ["Easy to discover and evaluate", "Clear product homepage"],
      cons: ["Pricing details may change", "Feature depth depends on plan"],
      languageSupport: ["en", "ja"],
    },
    ja: {
      name: input.name,
      description:
        input.description?.trim() ||
        `${input.name}はAIツールです。機能・料金・ユースケースを比較検討できます。`,
      features: [
        "日常業務向けのAI機能",
        "公式サイトからのWebアクセス",
        "個人・チームでの導入検討に適した情報整理",
      ],
      pros: ["発見と比較がしやすい", "公式サイトが明確"],
      cons: ["料金は変動する可能性あり", "プランにより機能差あり"],
      languageSupport: ["ja", "en"],
    },
  };
}

export const writerPlugin: AgentPlugin = {
  manifest: {
    key: "writer",
    version: "0.1.0",
    displayName: { en: "Writer", ja: "ライター" },
    description: {
      en: "Generates bilingual AI tool page drafts using shared company knowledge.",
      ja: "共有ナレッジを使って日英のAIツールページ下書きを生成します。",
    },
    subscribe: [EventTypes.ToolReviewed, EventTypes.ContentRejected],
    publish: [EventTypes.ContentDraftGenerated],
    capabilities: ["generate_tool_page", "bilingual"],
    permissions: ["knowledge.read", "drafts.write", "llm.complete"],
    requiredProviders: { llm: ["openai", "anthropic", "gemini", "grok", "local", "mock"] },
    dependencies: [{ key: "reviewer", versionRange: "^0.1.0" }],
    marketplace: {
      visibility: "internal",
      listingStatus: "published",
      tags: ["builtin", "content"],
    },
  },
  async handle(ctx, event) {
    if (event.type === EventTypes.ContentRejected) {
      const rejected = parseEvent(event, ContentRejectedDataSchema).data;
      await ctx.repos.workflows.markStep(rejected.workflowId, "writer", "running");
      await ctx.repos.drafts.setStatus(rejected.draftId, "building");
      const draft = await ctx.repos.drafts.findById(rejected.draftId);
      if (!draft) throw new Error("draft not found for revise");
      const payload = draft.payload as Record<string, unknown>;
      payload.revisionNote = rejected.comment ?? "rejected";
      payload.assetsReady = false;
      payload.translationReady = false;
      payload.seoReady = false;
      await ctx.repos.drafts.upsertBuilding({
        id: draft.id,
        kind: "tool_page",
        payload: payload as Prisma.InputJsonValue,
        workflowId: rejected.workflowId,
        toolId: draft.toolId ?? undefined,
      });
      const outgoing = createEvent({
        type: EventTypes.ContentDraftGenerated,
        source: "agent:writer",
        dataschema:
          "https://ai-base.local/schemas/content.draft.generated.v1.json",
        correlationid: event.correlationid,
        causationid: event.id,
        subject: draft.id,
        data: {
          draftId: draft.id,
          workflowId: rejected.workflowId,
          candidateId: String(payload.candidateId ?? ""),
          slug: String(payload.slug ?? "tool"),
          locales: ["en", "ja"],
        },
      });
      await ctx.publish(outgoing);
      await ctx.repos.workflows.markStep(rejected.workflowId, "writer", "completed");
      await ctx.repos.workflows.setState(rejected.workflowId, "designing");
      return;
    }

    const reviewed = parseEvent(event, ToolReviewedDataSchema).data;
    if (!reviewed.passed) {
      await ctx.logger.info("skipping writer; review failed", {
        reasons: reviewed.reasons,
      });
      return;
    }

    await ctx.repos.workflows.markStep(reviewed.workflowId, "writer", "running");
    const candidate = await ctx.repos.candidates.findById(reviewed.candidateId);
    if (!candidate) throw new Error("candidate not found");

    const slugHint = slugify(candidate.name);
    const knowledgeContext = await ctx.knowledge.decisionContext({
      agentKey: "writer",
      query: `${candidate.name} ${candidate.description ?? ""} AI tool`,
      toolSlug: slugHint,
    });

    const prompt = [
      "Generate bilingual (en, ja) marketing copy for an AI tool page as JSON.",
      "Schema: { en: {name, description, features[], pros[], cons[], languageSupport[]}, ja: {...} }",
      `Name: ${candidate.name}`,
      `Homepage: ${candidate.homepageUrl}`,
      `Description: ${candidate.description ?? ""}`,
      `Categories: ${(reviewed.suggestedCategoryKeys ?? []).join(", ")}`,
      "",
      "Shared company knowledge (graph + memory + RAG):",
      knowledgeContext,
    ].join("\n");

    let locales = buildFallbackContent({
      name: candidate.name,
      description: candidate.description ?? undefined,
      homepageUrl: candidate.homepageUrl,
    });

    try {
      const completion = await ctx.llm.complete({
        messages: [
          {
            role: "system",
            content:
              "You are the AI BASE Writer agent. Return valid JSON only.",
          },
          { role: "user", content: prompt },
        ],
        responseFormat: "json",
      });
      const parsed = JSON.parse(completion.content) as {
        en?: LocaleContent;
        ja?: LocaleContent;
      };
      if (parsed.en?.name && parsed.ja?.name) {
        locales = { en: parsed.en, ja: parsed.ja };
      }
    } catch (error) {
      await ctx.logger.warn("llm generation failed; using deterministic copy", {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    const slug = slugify(candidate.name);
    const payload = {
      candidateId: candidate.id,
      slug,
      homepageUrl: candidate.homepageUrl,
      sourceName: candidate.sourceName,
      sourceUrl: candidate.sourceUrl,
      externalId: candidate.externalId,
      categoryKeys: reviewed.suggestedCategoryKeys ?? [],
      pricingModel: "unknown",
      hasFreePlan: false,
      hasApi: false,
      locales,
      media: [] as Array<{ type: string; url: string; alt?: string }>,
      seo: {},
      assetsReady: false,
      translationReady: false,
      seoReady: false,
    };

    const draft = await ctx.repos.drafts.upsertBuilding({
      kind: "tool_page",
      payload: payload as Prisma.InputJsonValue,
      workflowId: reviewed.workflowId,
    });

    const outgoing = createEvent({
      type: EventTypes.ContentDraftGenerated,
      source: "agent:writer",
      dataschema:
        "https://ai-base.local/schemas/content.draft.generated.v1.json",
      correlationid: event.correlationid,
      causationid: event.id,
      subject: draft.id,
      data: {
        draftId: draft.id,
        workflowId: reviewed.workflowId,
        candidateId: candidate.id,
        slug,
        locales: ["en", "ja"],
      },
    });
    parseEvent(outgoing, ContentDraftGeneratedDataSchema);
    await ctx.publish(outgoing);

    await ctx.repos.workflows.markStep(reviewed.workflowId, "writer", "completed");
    await ctx.repos.workflows.setState(reviewed.workflowId, "designing");
  },
};
