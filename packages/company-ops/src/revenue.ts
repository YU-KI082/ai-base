import { prisma, repos } from "@ai-base/database";

export type RevenueDashboard = {
  today: { revenue: number; clicks: number; conversions: number; profit: number };
  yesterday: { revenue: number; clicks: number; conversions: number; profit: number };
  month: { revenue: number; clicks: number; conversions: number; profit: number };
  total: { revenue: number; conversions: number; profit: number };
  byAsp: Array<{ network: string; revenue: number; conversions: number }>;
  byArticle: Array<{ slug: string; title: string; clicks: number }>;
  bySns: Array<{
    platform: string;
    plays: number;
    clicks: number;
    conversions: number;
    revenue: number;
  }>;
  roi: number;
};

async function conversionWindow(start: Date, end?: Date) {
  const agg = await prisma.affiliateConversion.aggregate({
    where: {
      occurredAt: end ? { gte: start, lt: end } : { gte: start },
    },
    _sum: { amountUsd: true },
    _count: true,
  });
  const revenue = Number(agg._sum.amountUsd ?? 0);
  return {
    revenue,
    conversions: agg._count,
    profit: revenue * 0.7,
  };
}

/**
 * Unified revenue dashboard for the AI company.
 */
export async function buildRevenueDashboard(): Promise<RevenueDashboard> {
  const now = new Date();
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const startYesterday = new Date(startToday);
  startYesterday.setDate(startYesterday.getDate() - 1);
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [today, yesterday, month, allTime, byNetwork, posts, articles] =
    await Promise.all([
      conversionWindow(startToday),
      conversionWindow(startYesterday, startToday),
      conversionWindow(startMonth),
      conversionWindow(new Date(0)),
      prisma.affiliateConversion.groupBy({
        by: ["toolId"],
        where: { occurredAt: { gte: startMonth } },
        _sum: { amountUsd: true },
        _count: true,
      }),
      repos.socialPosts.list(),
      repos.articles.listPublished("ja", 20).catch(() => []),
    ]);

  const links = await repos.affiliates.list();
  const toolNetwork = new Map(links.map((l) => [l.toolId, l.network || "direct"]));
  const byAspMap = new Map<string, { revenue: number; conversions: number }>();
  for (const row of byNetwork) {
    const network = toolNetwork.get(row.toolId) || "unknown";
    const cur = byAspMap.get(network) ?? { revenue: 0, conversions: 0 };
    cur.revenue += Number(row._sum.amountUsd ?? 0);
    cur.conversions += row._count;
    byAspMap.set(network, cur);
  }

  const bySnsMap = new Map<
    string,
    { plays: number; clicks: number; conversions: number; revenue: number }
  >();
  for (const p of posts) {
    const m = p.metrics?.[0];
    const cur = bySnsMap.get(p.platform) ?? {
      plays: 0,
      clicks: 0,
      conversions: 0,
      revenue: 0,
    };
    cur.plays += m?.plays ?? 0;
    cur.clicks += m?.affiliateClicks ?? 0;
    cur.conversions += m?.conversions ?? 0;
    cur.revenue += Number(m?.revenue ?? 0);
    bySnsMap.set(p.platform, cur);
  }

  const goClicks = await prisma.analyticsEvent.count({
    where: {
      name: { in: ["affiliate.click", "go.click", "outbound.click"] },
      createdAt: { gte: startMonth },
    },
  });

  const roi =
    month.revenue > 0 ? month.profit / Math.max(month.revenue * 0.25, 1) : 0;

  return {
    today: { ...today, clicks: 0 },
    yesterday: { ...yesterday, clicks: 0 },
    month: { ...month, clicks: goClicks },
    total: {
      revenue: allTime.revenue,
      conversions: allTime.conversions,
      profit: allTime.profit,
    },
    byAsp: [...byAspMap.entries()].map(([network, v]) => ({
      network,
      ...v,
    })),
    byArticle: articles.slice(0, 10).map((a) => ({
      slug: a.slug,
      title: a.translations[0]?.title ?? a.slug,
      clicks: 0,
    })),
    bySns: [...bySnsMap.entries()].map(([platform, v]) => ({
      platform,
      ...v,
    })),
    roi,
  };
}
