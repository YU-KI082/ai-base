import { discoverFromSources } from "@ai-base/scout-sources";
import { repos } from "@ai-base/database";

export type TrendPrediction = {
  name: string;
  score: number;
  rationale: string;
  source: string;
  homepageUrl?: string;
};

/**
 * Combine research discoveries + SNS learning hints into ranked predictions.
 */
export async function predictRisingAi(limit = 5): Promise<TrendPrediction[]> {
  const [discovered, prior] = await Promise.all([
    discoverFromSources({ limit: 12 }),
    repos.socialPosts.listTikTokPublishedForLearning(20).catch(() => []),
  ]);

  const playBoost = new Map<string, number>();
  for (const p of prior) {
    const plays = p.metrics?.[0]?.plays ?? 0;
    const key = (p.theme || p.hook || "").toLowerCase();
    if (!key) continue;
    playBoost.set(key, (playBoost.get(key) ?? 0) + plays);
  }

  const preds: TrendPrediction[] = discovered.map((d, i) => {
    const freshness = 1 - i / Math.max(discovered.length, 1);
    const social =
      [...playBoost.entries()].find(([k]) =>
        k.includes(d.name.toLowerCase().slice(0, 6)),
      )?.[1] ?? 0;
    const score = Math.round(40 + freshness * 40 + Math.min(social / 1000, 20));
    return {
      name: d.name,
      score,
      rationale: `${d.sourceName} discovery + socialBoost=${social}`,
      source: d.sourceName,
      homepageUrl: d.homepageUrl,
    };
  });

  return preds.sort((a, b) => b.score - a.score).slice(0, limit);
}
