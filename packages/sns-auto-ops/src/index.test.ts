import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  defaultAutoOpsSettings,
  effectiveDailyLimit,
  parseAutoOpsSettings,
} from "./settings.js";
import {
  contentHash,
  duplicateRatio,
  evaluateAutoPublishGate,
  hasForbiddenPhrases,
} from "./gate.js";
import { revenueLearningScore } from "./revenue-learning.js";

describe("sns-auto-ops", () => {
  it("defaults to full_auto with emergency stop off", () => {
    const s = defaultAutoOpsSettings();
    assert.equal(s.mode, "full_auto");
    assert.equal(s.emergencyStop, false);
    assert.ok(s.platformsEnabled.includes("tiktok"));
  });

  it("ramps daily limit after test days", () => {
    const started = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    const s = parseAutoOpsSettings({
      mode: "full_auto",
      emergencyStop: false,
      dailyPostLimit: 5,
      ramp: {
        enabled: true,
        startDailyLimit: 1,
        testDays: 7,
        afterTestDailyLimit: 3,
        startedAt: started,
      },
    });
    assert.equal(effectiveDailyLimit(s), 3);
  });

  it("blocks forbidden phrases and low scores", () => {
    assert.equal(hasForbiddenPhrases("必ず稼げるAI"), true);
    const gate = evaluateAutoPublishGate({
      settings: parseAutoOpsSettings({
        mode: "full_auto",
        emergencyStop: false,
      }),
      platform: "instagram",
      content: "AIツール紹介",
      scoreTotal: 70,
      riskFlags: [],
      toolId: "t1",
      hasHealthyAffiliateLink: true,
      destinationUrlOk: true,
      affiliateLinkOk: true,
      mediaUrlOk: true,
      factsVerified: true,
      recentContents: [],
      postsToday: 0,
      effectiveDailyLimit: 1,
      hoursSinceLastPlatformPost: 48,
      minIntervalHours: 24,
      emergencyStop: false,
      oauthOk: true,
    });
    assert.equal(gate.ok, false);
    assert.ok(gate.reasons.some((r) => r.includes("品質スコア")));
  });

  it("passes when all conditions met", () => {
    const gate = evaluateAutoPublishGate({
      settings: parseAutoOpsSettings({
        mode: "full_auto",
        emergencyStop: false,
        minQualityScore: 80,
      }),
      platform: "tiktok",
      content: "ChatGPTの使い方を3ステップで解説",
      scoreTotal: 88,
      riskFlags: [],
      toolId: "t1",
      hasHealthyAffiliateLink: true,
      destinationUrlOk: true,
      affiliateLinkOk: true,
      mediaUrlOk: true,
      factsVerified: true,
      recentContents: ["別の投稿です"],
      postsToday: 0,
      effectiveDailyLimit: 1,
      hoursSinceLastPlatformPost: 30,
      minIntervalHours: 24,
      emergencyStop: false,
      oauthOk: true,
    });
    assert.equal(gate.ok, true);
  });

  it("blocks video platforms without mediaUrl", () => {
    const gate = evaluateAutoPublishGate({
      settings: parseAutoOpsSettings({
        mode: "full_auto",
        emergencyStop: false,
        minQualityScore: 80,
      }),
      platform: "tiktok",
      content: "ChatGPTの使い方を3ステップで解説",
      scoreTotal: 88,
      riskFlags: [],
      toolId: "t1",
      hasHealthyAffiliateLink: true,
      destinationUrlOk: true,
      affiliateLinkOk: true,
      mediaUrlOk: false,
      factsVerified: true,
      recentContents: [],
      postsToday: 0,
      effectiveDailyLimit: 1,
      hoursSinceLastPlatformPost: 30,
      minIntervalHours: 24,
      emergencyStop: false,
      oauthOk: true,
    });
    assert.equal(gate.ok, false);
    assert.ok(gate.reasons.some((r) => r.includes("mediaUrl")));
  });
  it("ranks revenue over vanity plays", () => {
    const highPlays = revenueLearningScore({
      plays: 50000,
      clicks: 0,
      conversions: 0,
      revenue: 0,
    });
    const converted = revenueLearningScore({
      plays: 800,
      clicks: 40,
      conversions: 3,
      revenue: 120,
      profit: 90,
    });
    assert.ok(converted.score > highPlays.score);
    assert.equal(highPlays.outcome.kind, "high_views_low_revenue");
  });

  it("hashes content stably", () => {
    assert.equal(contentHash("a  b"), contentHash("a b"));
    assert.ok(duplicateRatio("ai tool compare chatgpt", "chatgpt compare ai tool") > 0.4);
  });
});
