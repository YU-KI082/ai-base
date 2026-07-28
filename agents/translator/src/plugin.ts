import type { AgentPlugin } from "@ai-base/agents-sdk";
import {
  createEvent,
  EventTypes,
  parseEvent,
  ContentDraftGeneratedDataSchema,
  ContentTranslatedDataSchema,
} from "@ai-base/events";

type LocaleBlock = {
  name?: string;
  description?: string;
  features?: string[];
  pros?: string[];
  cons?: string[];
};

export const translatorPlugin: AgentPlugin = {
  manifest: {
    key: "translator",
    version: "0.1.0",
    displayName: { en: "Translator", ja: "翻訳" },
    subscribe: [EventTypes.ContentDraftGenerated],
    publish: [EventTypes.ContentTranslated],
    capabilities: ["translate", "ja", "en"],
  },
  async handle(ctx, event) {
    const data = parseEvent(event, ContentDraftGeneratedDataSchema).data;
    await ctx.repos.workflows.markStep(data.workflowId, "translator", "running");

    const draft = await ctx.repos.drafts.findById(data.draftId);
    if (!draft) throw new Error("draft not found");
    const payload = draft.payload as {
      locales?: { en?: LocaleBlock; ja?: LocaleBlock };
      [key: string]: unknown;
    };

    const locales = payload.locales ?? {};
    if (!locales.en?.name || !locales.en?.description) {
      throw new Error("missing English locale content");
    }
    if (!locales.ja?.name || !locales.ja?.description) {
      try {
        const completion = await ctx.llm.complete({
          messages: [
            {
              role: "system",
              content:
                "Translate AI tool page copy from English to Japanese. Return JSON { name, description, features, pros, cons }.",
            },
            {
              role: "user",
              content: JSON.stringify(locales.en),
            },
          ],
          responseFormat: "json",
        });
        locales.ja = JSON.parse(completion.content) as LocaleBlock;
      } catch {
        locales.ja = {
          name: locales.en.name,
          description: `${locales.en.description}（日本語訳準備中）`,
          features: locales.en.features ?? [],
          pros: locales.en.pros ?? [],
          cons: locales.en.cons ?? [],
        };
      }
    }

    payload.locales = locales;
    payload.translationReady = true;
    await ctx.repos.drafts.mergePayload(draft.id, {
      locales,
      translationReady: true,
    });

    const outgoing = createEvent({
      type: EventTypes.ContentTranslated,
      source: "agent:translator",
      dataschema: "https://ai-base.local/schemas/content.translated.v1.json",
      correlationid: event.correlationid,
      causationid: event.id,
      subject: draft.id,
      data: {
        draftId: draft.id,
        workflowId: data.workflowId,
        locales: ["en", "ja"],
        completedLocales: ["en", "ja"],
      },
    });
    parseEvent(outgoing, ContentTranslatedDataSchema);
    await ctx.publish(outgoing);
    await ctx.repos.workflows.markStep(data.workflowId, "translator", "completed");
    await ctx.repos.workflows.setState(data.workflowId, "translating");
  },
};
