import { repos } from "@ai-base/database";
import {
  extractTikTokLearningHints,
  TIKTOK_CONTENT_KINDS,
  type TikTokContentKind,
} from "@ai-base/sns-learning";

export type DailyTheme = {
  kind: TikTokContentKind | "article_promo" | "trend";
  toolId: string | null;
  toolSlug: string | null;
  toolName: string;
  locale: "ja" | "en";
  rationale: string;
  preferredDurationSec: 15 | 30 | 60;
  preferredHookType: string | null;
  preferredCta: string | null;
  preferredPostedAtHint: string | null;
};

/**
 * Pick today's theme from new tools, articles, trends, and past winners.
 * Revenue / affiliate CV signals outrank raw plays.
 */
export async function selectDailyTheme(input?: {
  locale?: "ja" | "en";
}): Promise<DailyTheme> {
  const locale = input?.locale ?? "ja";
  const [tools, articles, prior] = await Promise.all([
    repos.tools.findPublished(locale, { take: 20 }),
    repos.articles.listPublished(locale, 10),
    repos.socialPosts.listTikTokPublishedForLearning(30),
  ]);

  const hints = extractTikTokLearningHints({
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

  const duration =
    hints.preferredDurationSec === 15 ||
    hints.preferredDurationSec === 30 ||
    hints.preferredDurationSec === 60
      ? (hints.preferredDurationSec as 15 | 30 | 60)
      : 30;

  // Prefer newest tool that already has a healthy affiliate link
  const withAff = tools.find((t) => (t.affiliateLinks?.length ?? 0) > 0);
  const tool = withAff ?? tools[0];
  if (tool) {
    const name = tool.translations[0]?.name ?? tool.slug;
    const day = new Date().getDay();
    const kind = TIKTOK_CONTENT_KINDS[day % TIKTOK_CONTENT_KINDS.length]!;
    return {
      kind,
      toolId: tool.id,
      toolSlug: tool.slug,
      toolName: name,
      locale,
      rationale: `New/featured tool ${name} + learning sample=${hints.sampleSize}${withAff ? " (affiliate-ready)" : ""}`,
      preferredDurationSec: duration,
      preferredHookType: hints.preferredHookType,
      preferredCta: hints.preferredCta,
      preferredPostedAtHint: hints.preferredPostedAtHint,
    };
  }

  const article = articles[0];
  if (article) {
    const title = article.translations[0]?.title ?? article.slug;
    return {
      kind: "article_promo",
      toolId: null,
      toolSlug: null,
      toolName: title.slice(0, 40),
      locale,
      rationale: `Promote article ${article.slug}`,
      preferredDurationSec: duration,
      preferredHookType: hints.preferredHookType,
      preferredCta: hints.preferredCta,
      preferredPostedAtHint: hints.preferredPostedAtHint,
    };
  }

  return {
    kind: "trend",
    toolId: null,
    toolSlug: null,
    toolName: locale === "ja" ? "今日のAIトレンド" : "AI trend today",
    locale,
    rationale: "Fallback trend theme",
    preferredDurationSec: duration,
    preferredHookType: hints.preferredHookType,
    preferredCta: hints.preferredCta,
    preferredPostedAtHint: hints.preferredPostedAtHint,
  };
}
