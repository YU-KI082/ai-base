import type { AgentPlugin } from "@ai-base/agents-sdk";
import { repos } from "@ai-base/database";
import {
  EventTypes,
  VideoRenderRequestedDataSchema,
  createEvent,
  parseEvent,
} from "@ai-base/events";
import {
  attachTikTokAssetPackage,
  generateTikTokDraftBundle,
} from "@ai-base/sns-learning";
import {
  getTtsProvider,
  planFromBeats,
  renderVerticalVideo,
} from "@ai-base/video-render";

/**
 * Video Agent — FFmpeg / Remotion / ElevenLabs / image APIs via providers.
 */
export const videoPlugin: AgentPlugin = {
  manifest: {
    key: "video",
    version: "0.1.0",
    displayName: { en: "Video", ja: "動画制作" },
    subscribe: [EventTypes.VideoRenderRequested],
    publish: [EventTypes.VideoRenderReady],
    capabilities: [
      "ffmpeg",
      "remotion",
      "elevenlabs",
      "subtitles",
      "thumbnail",
      "short_form",
    ],
  },

  async handle(ctx, event) {
    if (event.type !== EventTypes.VideoRenderRequested) return;
    const data = parseEvent(event, VideoRenderRequestedDataSchema).data;

    let toolName = "AI BASE";
    let toolSlug: string | undefined = data.toolSlug;
    if (toolSlug) {
      const tool = await repos.tools.findBySlug(toolSlug);
      toolName = tool?.translations?.[0]?.name ?? toolSlug;
    } else {
      const tools = await repos.tools.findPublished("ja", { take: 1 });
      const t = tools[0];
      if (t) {
        toolSlug = t.slug;
        toolName = t.translations[0]?.name ?? t.slug;
      }
    }

    const durationSec = data.durationSec ?? 30;

    const bundle = attachTikTokAssetPackage(
      generateTikTokDraftBundle({
        contentKind: "tool_intro",
        locale: "ja",
        toolName,
        toolSlug,
        preferredDuration: durationSec,
      }),
      toolName,
      "ja",
    );

    const primary =
      bundle.scripts.find((s) => s.durationSec === durationSec) ??
      bundle.scripts[0]!;

    const tts = await getTtsProvider();
    try {
      await tts.synthesize({
        text: primary.beats.map((b) => b.narration).join(" "),
        locale: "ja",
      });
    } catch {
      // TTS optional
    }

    const plan = planFromBeats({
      id: `video-${Date.now().toString(36)}`,
      durationSec,
      title: bundle.hook,
      beats: primary.beats.map((b) => ({
        tStart: b.tStart,
        tEnd: b.tEnd,
        onScreenText: b.onScreenText,
        narration: b.narration,
      })),
      logoText: "AI BASE",
      locale: "ja",
    });

    const rendered = await renderVerticalVideo(plan);

    if (data.socialPostId) {
      await repos.socialPosts.updateMedia(data.socialPostId, rendered.mediaUrl);
    }

    await ctx.publish(
      createEvent({
        type: EventTypes.VideoRenderReady,
        source: "agent:video",
        dataschema: "https://ai-base.local/schemas/video.render.ready.v1.json",
        correlationid: event.correlationid,
        causationid: event.id,
        data: {
          mediaUrl: rendered.mediaUrl || "",
          provider: rendered.provider,
          durationSec: rendered.durationSec,
          socialPostId: data.socialPostId,
        },
      }),
    );

    await ctx.logger.info("Video rendered", {
      provider: rendered.provider,
      bytes: rendered.bytes,
      tts: tts.name,
    });
  },
};
