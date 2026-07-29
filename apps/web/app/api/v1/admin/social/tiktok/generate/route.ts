import { z } from "zod";
import { repos } from "@ai-base/database";
import {
  attachTikTokAssetPackage,
  extractTikTokLearningHints,
  generateTikTokDraftBundle,
  scoreSocialDraft,
  TIKTOK_CONTENT_KINDS,
} from "@ai-base/sns-learning";
import { withAdmin } from "@/app/api/v1/_lib/admin";
import { jsonError, jsonOk, readJsonSchema } from "@/app/api/v1/_lib/http";

const GenerateSchema = z.object({
  toolSlug: z.string().min(1),
  contentKind: z.enum([
    "tool_intro",
    "compare",
    "ranking",
    "ai_news",
    "howto",
    "failure",
    "before_after",
    "beginner",
  ]),
  locale: z.enum(["ja", "en"]).default("ja"),
  durationSec: z.union([z.literal(15), z.literal(30), z.literal(60)]).optional(),
  status: z
    .enum(["draft", "pending_approval", "ready", "scheduled"])
    .default("draft"),
});

/** Generate TikTok draft with 15/30/60s scripts + 9:16 media plan. */
export async function POST(request: Request) {
  return withAdmin(request, "settings.manage", async () => {
    let body: z.infer<typeof GenerateSchema>;
    try {
      body = await readJsonSchema(request, GenerateSchema);
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : String(error), 400);
    }

    const tools = await repos.tools.findPublishedBySlugs([body.toolSlug], body.locale);
    const tool = tools[0];
    if (!tool) return jsonError("Tool not found", 404);
    const toolName = tool.translations[0]?.name ?? tool.slug;

    const prior = await repos.socialPosts.listTikTokPublishedForLearning(40);
    const learningHints = extractTikTokLearningHints({
      posts: prior.map((p) => ({
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

    const bundle = attachTikTokAssetPackage(
      generateTikTokDraftBundle({
        contentKind: body.contentKind,
        locale: body.locale,
        toolName,
        toolSlug: tool.slug,
        preferredDuration: body.durationSec,
        learningHints: {
          preferredHookType: learningHints.preferredHookType,
          preferredDurationSec: learningHints.preferredDurationSec,
          preferredCta: learningHints.preferredCta,
          preferredPostedAtHint: learningHints.preferredPostedAtHint,
          preferredSubtitleDensity: learningHints.preferredSubtitleDensity,
        },
      }),
      toolName,
      body.locale,
    );

    const score = scoreSocialDraft({
      platform: "tiktok",
      locale: body.locale,
      theme: bundle.theme,
      hook: bundle.hook,
      hookType: bundle.hookType,
      durationSec: bundle.durationSec,
      cta: bundle.cta,
      content: bundle.content,
      toolId: tool.id,
      patternConfidenceAvg: 0.4,
      learningWeight: Math.min(1, learningHints.sampleSize / 5),
    });

    const item = await repos.socialPosts.createDraft({
      platform: "tiktok",
      locale: body.locale,
      status: body.status,
      toolId: tool.id,
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
        kinds: TIKTOK_CONTENT_KINDS,
      },
    });

    return jsonOk(
      {
        item,
        bundle: {
          scripts: bundle.scripts,
          mediaPlan: bundle.mediaPlan,
          assetPackage: bundle.assetPackage,
          learningHints,
        },
      },
      { status: 201 },
    );
  });
}
