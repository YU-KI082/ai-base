import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  attachTikTokAssetPackage,
  buildSrtFromScript,
  extractTikTokLearningHints,
  generateTikTokDraftBundle,
  TIKTOK_CONTENT_KINDS,
  TIKTOK_DURATIONS,
} from "./index.js";

describe("TikTok draft generation", () => {
  it("generates all content kinds with 15/30/60 scripts", () => {
    for (const contentKind of TIKTOK_CONTENT_KINDS) {
      const bundle = generateTikTokDraftBundle({
        contentKind,
        locale: "ja",
        toolName: "ChatGPT",
        toolSlug: "chatgpt",
      });
      assert.equal(bundle.format, "vertical_video");
      assert.equal(bundle.scripts.length, TIKTOK_DURATIONS.length);
      for (const d of TIKTOK_DURATIONS) {
        const script = bundle.scripts.find((s) => s.durationSec === d);
        assert.ok(script, `missing ${d}s script`);
        assert.ok(script.hook.length > 0);
        assert.ok(script.hookWindowSec <= 2);
        assert.ok(script.beats.length >= 3);
        assert.ok(script.beats[0]!.tEnd <= 2);
        assert.ok(script.beats[0]!.narration.length > 0);
        assert.ok(script.beats[0]!.onScreenText.length > 0);
        assert.ok(script.beats[0]!.visualDirection.length > 0);
        assert.ok(script.hashtags.length > 0);
        assert.match(script.aiBaseCta, /AI BASE/i);
        assert.ok(script.cta.length > 0);
      }
      assert.equal(bundle.mediaPlan.aspectRatio, "9:16");
      assert.equal(bundle.mediaPlan.withSubtitles, true);
    }
  });

  it("attaches SRT + storyboard asset package", () => {
    const base = generateTikTokDraftBundle({
      contentKind: "tool_intro",
      locale: "ja",
      toolName: "Claude",
      toolSlug: "claude",
      preferredDuration: 30,
    });
    const bundle = attachTikTokAssetPackage(base, "Claude", "ja");
    assert.ok(bundle.assetPackage);
    assert.equal(bundle.assetPackage.aspectRatio, "9:16");
    assert.equal(bundle.assetPackage.width, 1080);
    assert.equal(bundle.assetPackage.height, 1920);
    assert.ok(bundle.assetPackage.srt.includes("-->"));
    assert.ok(bundle.assetPackage.storyboard.length >= 3);
    assert.ok(bundle.assetPackage.bgmCandidates.length >= 1);
    assert.ok(bundle.assetPackage.thumbnailCandidates.length >= 1);
    assert.match(bundle.assetPackage.aiBaseCta, /AI BASE/i);
    assert.equal(bundle.mediaPlan.assetPackage?.durationSec, 30);

    const primary = bundle.scripts.find((s) => s.durationSec === 30)!;
    const srt = buildSrtFromScript(primary);
    assert.ok(srt.startsWith("1\n"));
  });

  it("reflects learning hints into preferred duration and CTA", () => {
    const hints = extractTikTokLearningHints({
      posts: [
        {
          hookType: "curiosity",
          durationSec: 15,
          theme: "intro",
          cta: "保存してAI BASEへ",
          subtitleDensity: "high",
          publishedAt: new Date("2026-07-01T19:00:00Z"),
          metrics: [
            {
              plays: 1000,
              affiliateClicks: 40,
              conversions: 5,
              revenue: 100,
              hold3SecRate: 0.7,
              completionRate: 0.4,
            },
          ],
        },
      ],
    });
    assert.equal(hints.preferredDurationSec, 15);
    assert.equal(hints.preferredHookType, "curiosity");
    assert.equal(hints.preferredCta, "保存してAI BASEへ");

    const bundle = generateTikTokDraftBundle({
      contentKind: "howto",
      locale: "ja",
      toolName: "Perplexity",
      learningHints: {
        preferredDurationSec: hints.preferredDurationSec,
        preferredCta: hints.preferredCta,
        preferredHookType: hints.preferredHookType,
        preferredSubtitleDensity: "high",
      },
    });
    assert.equal(bundle.durationSec, 15);
    assert.equal(bundle.cta, "保存してAI BASEへ");
  });
});
