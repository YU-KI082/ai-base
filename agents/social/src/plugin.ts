import type { AgentPlugin } from "@ai-base/agents-sdk";
import {
  EventTypes,
  createEvent,
  parseEvent,
  ContentPublishedDataSchema,
} from "@ai-base/events";
import { scoreSocialDraft } from "@ai-base/sns-learning";

/**
 * After tool publish: create Instagram/TikTok learning-aware drafts.
 * External auto-post stays disabled until official APIs are connected.
 */
export const socialPlugin: AgentPlugin = {
  manifest: {
    key: "social",
    version: "0.2.0",
    displayName: { en: "Social Agent", ja: "ソーシャルエージェント" },
    subscribe: [EventTypes.ContentPublished, EventTypes.SnsRecommendationsReady],
    publish: [EventTypes.SnsPostScoreRequested, EventTypes.SnsFeedbackTick],
    capabilities: [
      "tiktok",
      "instagram",
      "threads",
      "x",
      "youtube_shorts",
      "human_publish_gate",
    ],
  },
  async handle(ctx, event) {
    if (event.type === EventTypes.SnsRecommendationsReady) {
      await ctx.logger.info("Recommendations ready — drafts already scored by strategy");
      return;
    }

    const data = parseEvent(event, ContentPublishedDataSchema).data;
    const platforms = ["instagram", "tiktok", "x", "threads", "youtube_shorts"] as const;
    const createdIds: string[] = [];

    for (const platform of platforms) {
      for (const locale of ["en", "ja"] as const) {
        const content =
          locale === "en"
            ? `New on AI BASE: ${data.slug}\nHook: What changes if this tool is in your stack?\nCTA: Compare on AI BASE (tracked link)\nDo not copy third-party creatives.`
            : `AI BASEに新着: ${data.slug}\nフック: このツールで何が変わる？\nCTA: AI BASEで比較（計測リンク）\n他者クリエイティブの複製禁止。`;

        const score = scoreSocialDraft({
          platform: platform === "instagram" ? "instagram" : "tiktok",
          locale,
          theme: `tool_launch:${data.slug}`,
          hook:
            locale === "en"
              ? "What changes if this tool is in your stack?"
              : "このツールで何が変わる？",
          cta: locale === "en" ? "Compare on AI BASE" : "AI BASEで比較",
          content,
          toolId: data.toolId,
          patternConfidenceAvg: 0.2,
        });

        const post = await ctx.db.socialPost.create({
          data: {
            platform,
            locale,
            status: score.blocked ? "draft" : "draft",
            toolId: data.toolId,
            content,
            theme: `tool_launch:${data.slug}`,
            hook:
              locale === "en"
                ? "What changes if this tool is in your stack?"
                : "このツールで何が変わる？",
            hookType: "question",
            durationSec: 25,
            cta: locale === "en" ? "Compare on AI BASE" : "AI BASEで比較",
            scoreTotal: score.total,
            scoreBreakdown: score.breakdown,
            riskFlags: score.riskFlags,
          },
        });
        createdIds.push(post.id);

        await ctx.repos.snsLearning.createScore({
          socialPost: { connect: { id: post.id } },
          total: score.total,
          breakdown: score.breakdown,
          reasons: score.reasons,
          improvements: score.improvements,
          riskLevel: score.riskLevel,
          blocked: score.blocked,
        });
      }
    }

    await ctx.logger.info("social drafts created with scores", {
      toolId: data.toolId,
      count: createdIds.length,
    });
  },
};
