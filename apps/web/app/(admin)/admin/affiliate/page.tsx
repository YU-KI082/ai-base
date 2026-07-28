import { repos } from "@ai-base/database";
import { computePerformance } from "@ai-base/affiliate-intel";
import { AffiliateIntelClient } from "./affiliate-intel-client";

export default async function AffiliateAdminPage() {
  const [rows, links, tools] = await Promise.all([
    repos.affiliateIntel.performanceByTool(),
    repos.affiliates.list(),
    repos.tools.findPublished("en", { take: 200 }),
  ]);

  const items = rows.map(({ intelligence, clicks, conversions, revenue }) => {
    const perf = computePerformance({ clicks, conversions, revenue });
    const name =
      intelligence.tool.translations[0]?.name ?? intelligence.tool.slug;
    return {
      id: intelligence.id,
      toolId: intelligence.toolId,
      slug: intelligence.tool.slug,
      name,
      homepageUrl: intelligence.homepageUrl ?? intelligence.tool.homepageUrl,
      status: intelligence.status,
      hasAffiliate: intelligence.hasAffiliate,
      notes: intelligence.notes,
      links: intelligence.tool.affiliateLinks.map((l) => ({
        id: l.id,
        label: l.label,
        url: l.url,
        network: l.network,
        commission: l.commission,
        priority: l.priority,
        isHealthy: l.isHealthy,
      })),
      leads: intelligence.leads.map((l) => ({
        id: l.id,
        aspKey: l.aspKey,
        aspLabel: l.aspLabel,
        status: l.status,
        rewardText: l.rewardText,
        rewardAmount: l.rewardAmount != null ? Number(l.rewardAmount) : null,
        cookieDays: l.cookieDays,
        conversionTerms: l.conversionTerms,
        appliedAt: l.appliedAt?.toISOString() ?? null,
        approvedAt: l.approvedAt?.toISOString() ?? null,
        notes: l.notes,
      })),
      metrics: {
        clicks: perf.clicks,
        conversions: perf.conversions,
        sales: perf.sales,
        rewardAmount: perf.rewardAmount,
        cvr: perf.cvr,
        epc: perf.epc,
      },
    };
  });

  return (
    <main className="animate-in">
      <div className="page-header">
        <div>
          <p className="page-kicker">Monetization</p>
          <h1 className="page-title">Affiliate Intelligence</h1>
          <p className="page-subtitle">
            新規ツールは「アフィリエイト未確認」で登録。公式 / A8 / もしも /
            アクセストレード / バリューコマースを調査提案。公開は人間ゲート、数値は実データのみ。
          </p>
        </div>
      </div>
      <div style={{ marginTop: "1.5rem" }}>
        <AffiliateIntelClient
          initialItems={items}
          legacyLinks={links.map((l) => ({
            id: l.id,
            toolId: l.toolId,
            toolSlug: l.tool.slug,
            label: l.label,
            url: l.url,
            network: l.network,
            commission: l.commission,
            priority: l.priority,
            isHealthy: l.isHealthy,
          }))}
          tools={tools.map((t) => ({
            id: t.id,
            slug: t.slug,
            name: t.translations[0]?.name ?? t.slug,
          }))}
        />
      </div>
    </main>
  );
}
