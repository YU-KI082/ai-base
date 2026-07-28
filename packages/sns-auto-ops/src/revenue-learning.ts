import { classifyOwnPostOutcome } from "@ai-base/sns-learning";
import { REVENUE_LEARNING_PRIORITY } from "./settings.js";

/**
 * Revenue-first outcome score. High plays without monetization score poorly.
 */
export function revenueLearningScore(input: {
  profit?: number | null;
  revenue?: number | null;
  conversions?: number | null;
  clicks?: number | null;
  plays?: number | null;
  followRate?: number | null;
  saveRate?: number | null;
}): {
  score: number;
  outcome: ReturnType<typeof classifyOwnPostOutcome>;
  priorityBreakdown: Record<string, number>;
} {
  const profit = Number(input.profit ?? input.revenue ?? 0);
  const revenue = Number(input.revenue ?? 0);
  const conversions = Number(input.conversions ?? 0);
  const clicks = Number(input.clicks ?? 0);
  const plays = Number(input.plays ?? 0);
  const followRate = Number(input.followRate ?? 0);

  const cvr = clicks > 0 ? conversions / clicks : 0;
  const epc = clicks > 0 ? revenue / clicks : 0;
  const linkCtr = plays > 0 ? clicks / plays : 0;

  const priorityBreakdown: Record<string, number> = {
    profit: profit * 10,
    affiliateReward: revenue * 8,
    conversions: conversions * 50,
    cvr: cvr * 100,
    epc: epc * 20,
    freeSignups: 0,
    linkCtr: linkCtr * 80,
    followRate: followRate * 30,
    plays: Math.min(plays, 5000) * 0.002,
  };

  // Penalize vanity metrics without revenue
  if (plays >= 1000 && conversions === 0 && revenue === 0) {
    priorityBreakdown.plays = -20;
  }

  let score = 0;
  for (const row of REVENUE_LEARNING_PRIORITY) {
    score += (priorityBreakdown[row.key] ?? 0) * (row.weight / 100);
  }

  const outcome = classifyOwnPostOutcome({
    plays,
    affiliateClicks: clicks,
    conversions,
    revenue,
    saveRate: input.saveRate,
  });

  return { score, outcome, priorityBreakdown };
}

export function rankPostsByRevenue<T extends { score: number }>(
  items: T[],
): T[] {
  return [...items].sort((a, b) => b.score - a.score);
}
