import type { AgentPlugin } from "@ai-base/agents-sdk";
import {
  createEvent,
  EventTypes,
  parseEvent,
  ContentDraftGeneratedDataSchema,
  ContentAssetsReadyDataSchema,
} from "@ai-base/events";

export const designerPlugin: AgentPlugin = {
  manifest: {
    key: "designer",
    version: "0.1.0",
    displayName: { en: "Designer", ja: "デザイナー" },
    subscribe: [EventTypes.ContentDraftGenerated],
    publish: [EventTypes.ContentAssetsReady],
    capabilities: ["ogp", "thumbnail", "media"],
  },
  async handle(ctx, event) {
    const data = parseEvent(event, ContentDraftGeneratedDataSchema).data;
    await ctx.repos.workflows.markStep(data.workflowId, "designer", "running");

    const draft = await ctx.repos.drafts.findById(data.draftId);
    if (!draft) throw new Error("draft not found");
    const payload = draft.payload as Record<string, unknown>;
    const slug = String(payload.slug ?? data.slug);
    const media = [
      {
        type: "ogp" as const,
        url: `https://cdn.ai-base.local/ogp/${slug}.png`,
        alt: `${slug} OGP`,
      },
      {
        type: "thumbnail" as const,
        url: `https://cdn.ai-base.local/thumbnails/${slug}.png`,
        alt: `${slug} thumbnail`,
      },
      {
        type: "logo" as const,
        url: `https://cdn.ai-base.local/logos/${slug}.png`,
        alt: `${slug} logo`,
      },
    ];

    payload.media = media;
    payload.assetsReady = true;
    await ctx.repos.drafts.mergePayload(draft.id, {
      media,
      assetsReady: true,
    });

    const outgoing = createEvent({
      type: EventTypes.ContentAssetsReady,
      source: "agent:designer",
      dataschema: "https://ai-base.local/schemas/content.assets.ready.v1.json",
      correlationid: event.correlationid,
      causationid: event.id,
      subject: draft.id,
      data: {
        draftId: draft.id,
        workflowId: data.workflowId,
        media,
      },
    });
    parseEvent(outgoing, ContentAssetsReadyDataSchema);
    await ctx.publish(outgoing);
    await ctx.repos.workflows.markStep(data.workflowId, "designer", "completed");
  },
};
