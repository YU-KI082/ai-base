import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  assertNoFabricatedMetrics,
  buildRecommendations,
  classifyOwnPostOutcome,
  decayWeight,
  extractViralPatterns,
  planWeeklyExperiments,
  scoreSocialDraft,
  seedStructureObservations,
} from "./index.js";

describe("sns-learning", () => {
  it("seeds structure without fabricated engagement", () => {
    const seeds = seedStructureObservations();
    assert.ok(seeds.length >= 4);
    for (const s of seeds) {
      assert.equal(s.plays, null);
      assert.equal(s.sourceType, "seed_structure");
      assert.ok(s.whyItMayWork.length > 0);
    }
  });

  it("extracts patterns with low confidence until more evidence", () => {
    const patterns = extractViralPatterns(seedStructureObservations());
    assert.ok(patterns.length > 0);
    assert.ok(patterns.every((p) => p.confidence < 0.6));
  });

  it("plans single-factor experiments", () => {
    const plans = planWeeklyExperiments([
      { platform: "tiktok", locale: "ja", title: "t", confidence: 0.3 },
    ]);
    assert.equal(plans[0]?.changeFactor, "hook_type");
    assert.equal(plans[0]?.variants.length, 2);
  });

  it("blocks high copyright/hype risk drafts", () => {
    const score = scoreSocialDraft({
      platform: "tiktok",
      locale: "ja",
      content: "丸パクリで必ず稼げるAI",
      hook: "絶対儲かる",
    });
    assert.equal(score.blocked, true);
    assert.equal(score.riskLevel, "high");
  });

  it("scores safe drafts under 100", () => {
    const score = scoreSocialDraft({
      platform: "instagram",
      locale: "en",
      toolId: "t1",
      theme: "workflow",
      hook: "What if research took 10 minutes?",
      cta: "Link in bio for the comparison on AI BASE",
      content: "Step-by-step workflow checklist for evaluating AI tools.",
      patternConfidenceAvg: 0.3,
    });
    assert.ok(score.total <= 100);
    assert.equal(score.blocked, false);
  });

  it("decays older learning weight", () => {
    assert.ok(decayWeight(0, 21) > decayWeight(21, 21));
    assert.ok(Math.abs(decayWeight(21, 21) - 0.5) < 1e-9);
  });

  it("classifies high views low revenue", () => {
    const c = classifyOwnPostOutcome({
      plays: 5000,
      affiliateClicks: 0,
      conversions: 0,
    });
    assert.equal(c.kind, "high_views_low_revenue");
  });

  it("builds recommendations biased to conversions", () => {
    const recs = buildRecommendations({
      patterns: [
        {
          platform: "instagram",
          locale: "en",
          title: "deep",
          summary: "s",
          confidence: 0.3,
          structure: { theme: "deep dive", avgDurationSec: 30, ctaPattern: "bio" },
        },
      ],
      learning: [],
      tools: [{ id: "1", slug: "chatgpt", name: "ChatGPT" }],
      affiliates: [{ id: "a1", toolId: "1" }],
    });
    assert.equal(recs[0]?.goal, "link_clicks_and_affiliate_conversions");
    assert.equal(recs[0]?.affiliateLinkId, "a1");
  });

  it("rejects invalid metrics", () => {
    assert.throws(() => assertNoFabricatedMetrics({ plays: -1 }));
  });
});
