import type { AgentPlugin } from "@ai-base/agents-sdk";
import {
  EventTypes,
  parseEvent,
  ContentPublishedDataSchema,
} from "@ai-base/events";
import {
  attachTikTokAssetPackage,
  extractTikTokLearningHints,
  generateTikTokDraftBundle,
  scoreSocialDraft,
  TIKTOK_CONTENT_KINDS,
  type TikTokContentKind,
} from "@ai-base/sns-learning";

/**
 * After tool publish: create Instagram/TikTok learning-aware drafts.
 * TikTok is the primary acquisition channel — rich scripts (15/30/60s)
 * + media plans are generated for each content kind.
 * External post runs only after admin approval + OAuth connection check.
 */
export const socialPlugin: AgentPlugin = {
  manifest: {
    key: "social",
    version: "0.3.0",
    displayName: { en: "Social Agent", ja: "ソーシャルエージェント" },
    subscribe: [EventTypes.ContentPublished, EventTypes.SnsRecommendationsReady],
    publish: [EventTypes.SnsPostScoreRequested, EventTypes.SnsFeedbackTick],
    capabilities: [
      "tiktok",
      "instagram",
      "threads",
      "x",
      "note",
      "linkedin",
      "youtube_shorts",
      "human_publish_gate",
      "tiktok_script_generation",
    ],
  },
  async handle(ctx, event) {
    if (event.type === EventTypes.SnsRecommendationsReady) {
      await ctx.logger.info("Recommendations ready — drafts already scored by strategy");
      return;
    }

    const data = parseEvent(event, ContentPublishedDataSchema).data;
    const tool = await ctx.db.aiTool.findUnique({
      where: { id: data.toolId },
      include: { translations: true },
    });
    const toolSlug = data.slug;
    const createdIds: string[] = [];

    // Learning hints from prior winning TikTok posts (revenue-first)
    const priorTikTok = await ctx.db.socialPost.findMany({
      where: { platform: "tiktok", status: "published" },
      orderBy: { publishedAt: "desc" },
      take: 30,
      include: { metrics: { orderBy: { capturedAt: "desc" }, take: 1 } },
    });
    const learningHints = extractTikTokLearningHints({
      posts: priorTikTok.map((p) => ({
        hookType: p.hookType,
        durationSec: p.durationSec,
        theme: p.theme,
        cta: p.cta,
        subtitleDensity: p.subtitleDensity,
        publishedAt: p.publishedAt,
        metrics: p.metrics,
        scriptJson: p.scriptJson as { beats?: unknown } | null,
      })),
    });

    // TikTok: all content kinds × JA (primary) + EN subset
    const tiktokKinds: TikTokContentKind[] = [...TIKTOK_CONTENT_KINDS];
    for (const locale of ["ja", "en"] as const) {
      const toolName =
        tool?.translations.find((t) => t.locale === locale)?.name ?? toolSlug;
      const kinds =
        locale === "ja"
          ? tiktokKinds
          : (["tool_intro", "compare", "howto", "beginner"] as TikTokContentKind[]);

      for (const contentKind of kinds) {
        const bundle = attachTikTokAssetPackage(
          generateTikTokDraftBundle({
            contentKind,
            locale,
            toolName,
            toolSlug,
            learningHints: {
              preferredHookType: learningHints.preferredHookType,
              preferredDurationSec: learningHints.preferredDurationSec,
              preferredCta: learningHints.preferredCta,
              preferredPostedAtHint: learningHints.preferredPostedAtHint,
              preferredSubtitleDensity: learningHints.preferredSubtitleDensity,
            },
          }),
          toolName,
          locale,
        );

        const score = scoreSocialDraft({
          platform: "tiktok",
          locale,
          theme: bundle.theme,
          hook: bundle.hook,
          hookType: bundle.hookType,
          durationSec: bundle.durationSec,
          cta: bundle.cta,
          content: bundle.content,
          toolId: data.toolId,
          patternConfidenceAvg: 0.35,
          learningWeight: Math.min(1, learningHints.sampleSize / 5),
        });

        const post = await ctx.db.socialPost.create({
          data: {
            platform: "tiktok",
            locale,
            status: "draft",
            toolId: data.toolId,
            content: bundle.content,
            theme: bundle.theme,
            hook: bundle.hook,
            hookType: bundle.hookType,
            durationSec: bundle.durationSec,
            cta: bundle.cta,
            format: bundle.format,
            hashtags: bundle.hashtags,
            contentKind: bundle.contentKind,
            scriptJson: bundle.scripts,
            mediaPlanJson: bundle.mediaPlan,
            subtitleDensity: bundle.subtitleDensity,
            scoreTotal: score.total,
            scoreBreakdown: score.breakdown,
            riskFlags: score.riskFlags,
            autoDecision: {
              postedAtHint: bundle.postedAtHint,
              learningSampleSize: learningHints.sampleSize,
              preferredScriptShape: learningHints.preferredScriptShape,
            },
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

    // Instagram + other draft stubs (lighter)
    const otherPlatforms = ["instagram", "x", "threads", "note", "linkedin"] as const;
    for (const platform of otherPlatforms) {
      for (const locale of ["en", "ja"] as const) {
        const toolName =
          tool?.translations.find((t) => t.locale === locale)?.name ?? toolSlug;
        const content =
          locale === "en"
            ? `New on AI BASE: ${toolName}\nHook: What changes if this tool is in your stack?\nCTA: Compare on AI BASE (tracked link)\nDo not copy third-party creatives.`
            : `AI BASEに新着: ${toolName}\nフック: このツールで何が変わる？\nCTA: AI BASEで比較（計測リンク）\n他者クリエイティブの複製禁止。`;

        const score = scoreSocialDraft({
          platform: platform === "instagram" ? "instagram" : "tiktok",
          locale,
          theme: `tool_launch:${toolSlug}`,
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
            status: "draft",
            toolId: data.toolId,
            content,
            theme: `tool_launch:${toolSlug}`,
            hook:
              locale === "en"
                ? "What changes if this tool is in your stack?"
                : "このツールで何が変わる？",
            hookType: "question",
            durationSec: platform === "instagram" ? 30 : null,
            cta: locale === "en" ? "Compare on AI BASE" : "AI BASEで比較",
            contentKind: "tool_intro",
            format: platform === "instagram" ? "reel" : "text",
            scoreTotal: score.total,
            scoreBreakdown: score.breakdown,
            riskFlags: score.riskFlags,
          },
        });
        createdIds.push(post.id);
      }
    }

    await ctx.logger.info("social drafts created with TikTok scripts", {
      toolId: data.toolId,
      count: createdIds.length,
      tiktokLearningSample: learningHints.sampleSize,
    });
  },
};
