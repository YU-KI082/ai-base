import { repos } from "@ai-base/database";

export type AffiliateOfferScore = {
  linkId: string;
  toolId: string;
  network: string;
  url: string;
  score: number;
  reasons: string[];
};

/**
 * Pick best healthy affiliate offer per tool (priority, network preference, health).
 */
export async function optimizeAffiliateOffers(toolId?: string) {
  const links = await repos.affiliates.list(toolId);
  const byTool = new Map<string, typeof links>();
  for (const l of links) {
    const arr = byTool.get(l.toolId) ?? [];
    arr.push(l);
    byTool.set(l.toolId, arr);
  }

  const preferred = ["a8", "moshimo", "valuecommerce", "access_trade", "amazon"];
  const adopted: AffiliateOfferScore[] = [];

  for (const [tid, rows] of byTool) {
    const scored = rows.map((l) => {
      const reasons: string[] = [];
      let score = (l.priority ?? 0) * 10;
      if (l.isHealthy) {
        score += 40;
        reasons.push("healthy");
      } else {
        reasons.push("unhealthy");
      }
      const net = (l.network || "").toLowerCase();
      const pref = preferred.findIndex((p) => net.includes(p));
      if (pref >= 0) {
        score += 30 - pref * 4;
        reasons.push(`preferred_asp:${preferred[pref]}`);
      }
      if (l.commission) {
        score += 10;
        reasons.push("has_commission_note");
      }
      return {
        linkId: l.id,
        toolId: tid,
        network: l.network || "unknown",
        url: l.url,
        score,
        reasons,
      };
    });
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];
    if (!best) continue;
    adopted.push(best);
    // Raise priority of winner
    await repos.affiliates.update(best.linkId, {
      priority: Math.max(best.score, 100),
      isHealthy: true,
    });
  }

  // Mark expired/unhealthy for refresh
  for (const l of links) {
    if (!l.isHealthy) {
      await repos.opsAlerts
        .create({
          severity: "warning",
          kind: "affiliate_unhealthy",
          title: "アフィリエイトリンク要確認",
          message: `tool=${l.toolId} link=${l.id} network=${l.network}`,
          toolId: l.toolId,
        })
        .catch(() => null);
    }
  }

  return adopted;
}
