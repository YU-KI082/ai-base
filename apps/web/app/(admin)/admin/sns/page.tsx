import { cookies } from "next/headers";
import { getDictionary, resolveLocale } from "@ai-base/i18n";
import { repos } from "@ai-base/database";
import { SnsLearningClient } from "./sns-learning-client";

export default async function SnsLearningAdminPage() {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get("locale")?.value);
  const dict = getDictionary(locale);
  const data = await repos.snsLearning.dashboard();

  return (
    <main className="animate-in">
      <div className="page-header">
        <div>
          <p className="page-kicker">{dict.admin.snsKicker}</p>
          <h1 className="page-title">{dict.admin.snsTitle}</h1>
          <p className="page-subtitle">{dict.admin.snsSubtitle}</p>
        </div>
      </div>
      <div style={{ marginTop: "1.5rem" }}>
        <SnsLearningClient
          locale={locale}
          initial={{
            observations: data.observations.map((o) => ({
              id: o.id,
              platform: o.platform,
              locale: o.locale,
              theme: o.theme,
              hookPattern: o.hookPattern,
              durationSec: o.durationSec,
              ctaPattern: o.ctaPattern,
              sourceType: o.sourceType,
              confidence: o.confidence,
              status: o.status,
              plays: o.plays,
              whyItMayWork: o.whyItMayWork,
              humanNotes: o.humanNotes,
            })),
            patterns: data.patterns.map((p) => ({
              id: p.id,
              platform: p.platform,
              locale: p.locale,
              patternType: p.patternType,
              title: p.title,
              summary: p.summary,
              sampleSize: p.sampleSize,
              confidence: p.confidence,
              status: p.status,
              validUntil: p.validUntil?.toISOString() ?? null,
            })),
            experiments: data.experiments.map((e) => ({
              id: e.id,
              title: e.title,
              hypothesis: e.hypothesis,
              changeFactor: e.changeFactor,
              platform: e.platform,
              locale: e.locale,
              successMetric: e.successMetric,
              status: e.status,
              variants: e.variants.map((v) => ({
                key: v.key,
                label: v.label,
              })),
            })),
            recommendations: data.recommendations.map((r) => ({
              id: r.id,
              theme: r.theme,
              platform: r.platform,
              locale: r.locale,
              audience: r.audience,
              recommendedHook: r.recommendedHook,
              durationSec: r.durationSec,
              postedAtHint: r.postedAtHint,
              cta: r.cta,
              goal: r.goal,
              predictedScore: r.predictedScore,
              rationale: r.rationale,
              status: r.status,
              affiliateLinkId: r.affiliateLinkId,
            })),
            learning: data.learning.map((l) => ({
              id: l.id,
              kind: l.kind,
              platform: l.platform,
              locale: l.locale,
              title: l.title,
              content: l.content,
              importance: l.importance,
              status: l.status,
              observedAt: l.observedAt.toISOString(),
            })),
            improvements: data.improvements.map((i) => ({
              id: i.id,
              agentKey: i.agentKey,
              summary: i.summary,
              createdAt: i.createdAt.toISOString(),
            })),
            posts: data.posts.map((p) => ({
              id: p.id,
              platform: p.platform,
              locale: p.locale,
              status: p.status,
              theme: p.theme,
              hook: p.hook,
              cta: p.cta,
              durationSec: p.durationSec,
              scoreTotal: p.scoreTotal,
              riskFlags: p.riskFlags,
              publishedAt: p.publishedAt?.toISOString() ?? null,
              metrics: p.metrics.map((m) => ({
                windowHours: m.windowHours,
                plays: m.plays,
                avgWatchSec: m.avgWatchSec,
                watchRetentionRate: m.watchRetentionRate,
                hold3SecRate: m.hold3SecRate,
                completionRate: m.completionRate,
                likesCount: m.likesCount,
                commentsCount: m.commentsCount,
                sharesCount: m.sharesCount,
                savesCount: m.savesCount,
                profileVisits: m.profileVisits,
                affiliateClicks: m.affiliateClicks,
                conversions: m.conversions,
                revenue: m.revenue,
                saveRate: m.saveRate,
              })),
              contentKind: p.contentKind,
              subtitleDensity: p.subtitleDensity,
            })),
          }}
        />
      </div>
    </main>
  );
}
