import type { AgentPlugin } from "@ai-base/agents-sdk";
import { autoGenerateAndPublishArticle } from "@ai-base/company-ops";
import {
  ArticleGenerateRequestedDataSchema,
  ContentPublishedDataSchema,
  EventTypes,
  createEvent,
  parseEvent,
} from "@ai-base/events";

/**
 * SEO Content Agent — auto articles (compare/ranking/howto/faq/…) with
 * internal links, SEO title/description, JSON-LD embedded, OGP/canonical fields.
 */
export const seoContentPlugin: AgentPlugin = {
  manifest: {
    key: "seo-content",
    version: "0.1.0",
    displayName: { en: "SEO Content", ja: "SEO記事" },
    subscribe: [
      EventTypes.ArticleGenerateRequested,
      EventTypes.ContentPublished,
    ],
    publish: [EventTypes.ArticlePublished, EventTypes.SnsAutoOpsTick],
    capabilities: [
      "seo_articles",
      "json_ld",
      "internal_links",
      "ogp",
      "canonical",
    ],
  },

  async handle(ctx, event) {
    if (event.type === EventTypes.ContentPublished) {
      const data = parseEvent(event, ContentPublishedDataSchema).data;
      // On new tool publish → generate comparison + howto articles
      for (const kind of ["recommend", "howto", "faq"] as const) {
        await ctx.publish(
          createEvent({
            type: EventTypes.ArticleGenerateRequested,
            source: "agent:seo-content",
            dataschema:
              "https://ai-base.local/schemas/content.article.generate.requested.v1.json",
            correlationid: event.correlationid,
            causationid: event.id,
            data: {
              kind,
              toolSlugs: [data.slug],
              topic: data.slug,
              locale: "ja" as const,
              autoPublish: true,
            },
          }),
        );
      }
      return;
    }

    if (event.type !== EventTypes.ArticleGenerateRequested) return;
    const data = parseEvent(event, ArticleGenerateRequestedDataSchema).data;
    const result = await autoGenerateAndPublishArticle({
      kind: data.kind,
      toolSlugs: data.toolSlugs,
      topic: data.topic,
      locale: data.locale,
      autoPublish: data.autoPublish,
    });

    await ctx.publish(
      createEvent({
        type: EventTypes.ArticlePublished,
        source: "agent:seo-content",
        dataschema: "https://ai-base.local/schemas/content.article.published.v1.json",
        correlationid: event.correlationid,
        causationid: event.id,
        data: {
          articleId: result.article.id,
          slug: result.draft.slug,
          kind: result.draft.kind,
          locale: data.locale,
        },
      }),
    );

    // Kick SNS after article publish
    await ctx.publish(
      createEvent({
        type: EventTypes.SnsAutoOpsTick,
        source: "agent:seo-content",
        dataschema: "https://ai-base.local/schemas/sns-auto-ops-tick.json",
        correlationid: event.correlationid,
        causationid: event.id,
        data: { reason: "manual" as const },
      }),
    );

    await ctx.logger.info("SEO article published", {
      slug: result.draft.slug,
      kind: result.draft.kind,
    });
  },
};
