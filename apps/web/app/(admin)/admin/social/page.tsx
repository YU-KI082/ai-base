import { cookies } from "next/headers";
import { getDictionary, resolveLocale } from "@ai-base/i18n";
import { repos } from "@ai-base/database";
import { loadAutoOpsSettings } from "@ai-base/sns-auto-ops";
import { listConnectionSummaries } from "@ai-base/sns-oauth";
import { SocialAdminClient } from "./social-admin-client";

export default async function SocialAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ oauth?: string; provider?: string; oauth_error?: string }>;
}) {
  const sp = await searchParams;
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get("locale")?.value);
  const dict = getDictionary(locale);
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [posts, connections, tools, settings, sales] = await Promise.all([
    repos.socialPosts.list(),
    listConnectionSummaries(),
    repos.tools.findPublished(locale, { take: 120 }),
    loadAutoOpsSettings(),
    repos.opsMetrics.salesSummary(),
  ]);

  const todayPosts = posts.filter(
    (p) => p.createdAt >= startOfDay || (p.scheduledAt && p.scheduledAt >= startOfDay),
  );

  const counts = {
    scheduledToday: todayPosts.filter((p) =>
      ["scheduled", "ready"].includes(p.status),
    ).length,
    generating: posts.filter((p) =>
      ["draft", "pending_approval"].includes(p.status),
    ).length,
    published: posts.filter((p) => p.status === "published").length,
    failed: posts.filter((p) => p.status === "failed").length,
    retry: posts.filter((p) => p.status === "retry").length,
  };

  let plays = 0;
  let clicks = 0;
  let conversions = 0;
  for (const p of posts) {
    const m = p.metrics[0];
    if (!m) continue;
    plays += m.plays ?? 0;
    clicks += m.affiliateClicks ?? 0;
    conversions += m.conversions ?? 0;
  }

  return (
    <main className="animate-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{dict.admin.socialTitle}</h1>
          <p className="page-subtitle">
            {locale === "ja"
              ? "完全自動運用: 企画→動画→投稿→分析→改善（通常は承認不要）"
              : "Full-auto: plan → video → publish → analyze → improve (no approval)"}
          </p>
        </div>
      </div>
      <SocialAdminClient
        locale={locale}
        toolSlugs={tools.map((t) => t.slug)}
        opsSummary={{
          mode: settings.mode,
          emergencyStop: settings.emergencyStop,
          counts,
          plays,
          clicks,
          conversions,
          revenueUsd: Number(sales.monthSales ?? 0),
          profitUsd: Number(sales.monthProfit ?? 0),
        }}
        oauthFlash={
          sp.oauth_error
            ? { type: "error", message: sp.oauth_error }
            : sp.oauth === "connected"
              ? {
                  type: "ok",
                  message: `${sp.provider ?? ""} ${dict.admin.oauthConnectedFlash}`,
                }
              : null
        }
        connections={connections}
        initialPosts={posts.map((p) => {
          const scripts = Array.isArray(p.scriptJson) ? p.scriptJson : [];
          const mediaPlan =
            p.mediaPlanJson && typeof p.mediaPlanJson === "object"
              ? (p.mediaPlanJson as Record<string, unknown>)
              : null;
          const latest = p.metrics[0];
          return {
            id: p.id,
            platform: p.platform,
            locale: p.locale,
            status: p.status,
            content: p.content,
            toolId: p.toolId,
            contentKind: p.contentKind,
            durationSec: p.durationSec,
            hook: p.hook,
            cta: p.cta,
            hashtags: p.hashtags,
            mediaUrl: p.mediaUrl,
            lastPublishError: p.lastPublishError,
            externalPostId: p.externalPostId,
            scriptCount: scripts.length,
            scripts: scripts.map((s) => {
              const row = s as {
                durationSec?: number;
                hook?: string;
                cta?: string;
                hashtags?: string[];
                aiBaseCta?: string;
              };
              return {
                durationSec: row.durationSec ?? null,
                hook: row.hook ?? null,
                cta: row.cta ?? null,
                hashtags: row.hashtags ?? [],
                aiBaseCta: row.aiBaseCta ?? null,
              };
            }),
            hasAssetPackage: Boolean(
              mediaPlan &&
                typeof mediaPlan === "object" &&
                "assetPackage" in mediaPlan &&
                mediaPlan.assetPackage,
            ),
            metrics: latest
              ? {
                  plays: latest.plays,
                  avgWatchSec: latest.avgWatchSec,
                  watchRetentionRate: latest.watchRetentionRate,
                  hold3SecRate: latest.hold3SecRate,
                  completionRate: latest.completionRate,
                  likesCount: latest.likesCount,
                  commentsCount: latest.commentsCount,
                  sharesCount: latest.sharesCount,
                  savesCount: latest.savesCount,
                  profileVisits: latest.profileVisits,
                  affiliateClicks: latest.affiliateClicks,
                  conversions: latest.conversions,
                  source: latest.source,
                }
              : null,
            createdAt: p.createdAt.toISOString(),
          };
        })}
      />
    </main>
  );
}
