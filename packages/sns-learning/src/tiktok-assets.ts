import type {
  TikTokDraftBundle,
  TikTokMediaPlan,
  TikTokScript,
} from "./tiktok.js";

/**
 * TikTok vertical video asset package (9:16) — production-ready specs.
 * Does not download third-party media or scrape TikTok. Royalty-free BGM only.
 */

export type TikTokAssetPackage = {
  aspectRatio: "9:16";
  width: 1080;
  height: 1920;
  withBurnedInSubtitles: true;
  durationSec: number;
  /** SRT for all beats of the primary script */
  srt: string;
  storyboard: Array<{
    order: number;
    tStart: number;
    tEnd: number;
    shot: string;
    onScreenText: string;
    narration: string;
    logo: boolean;
  }>;
  toolUiIntro: {
    toolName: string;
    captureHints: string[];
    overlayLabels: string[];
  };
  logo: {
    watermark: "bottom-right";
    endcard: true;
    safeMarginPx: number;
    text: "AI BASE";
  };
  backgroundMotion: string[];
  bgmCandidates: Array<{ id: string; mood: string; usageNote: string }>;
  thumbnailCandidates: Array<{
    id: string;
    width: 1080;
    height: 1920;
    textOverlay: string;
    composition: string;
  }>;
  exportChecklist: string[];
  publishCaption: string;
  publishHashtags: string[];
  aiBaseCta: string;
  /** Ready for operator / API when mediaUrl is attached */
  status: "assets_planned" | "awaiting_render" | "ready_for_api";
};

function toSrtTime(sec: number): string {
  const ms = Math.max(0, Math.round(sec * 1000));
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const frac = ms % 1000;
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(frac, 3)}`;
}

export function buildSrtFromScript(script: TikTokScript): string {
  return script.beats
    .map((beat, i) => {
      return [
        String(i + 1),
        `${toSrtTime(beat.tStart)} --> ${toSrtTime(beat.tEnd)}`,
        beat.onScreenText || beat.narration,
        "",
      ].join("\n");
    })
    .join("\n");
}

export function generateTikTokAssetPackage(input: {
  toolName: string;
  locale: "ja" | "en";
  primaryScript: TikTokScript;
  mediaPlan: TikTokMediaPlan;
}): TikTokAssetPackage {
  const ja = input.locale === "ja";
  const script = input.primaryScript;

  const storyboard = script.beats.map((beat, i) => ({
    order: i + 1,
    tStart: beat.tStart,
    tEnd: beat.tEnd,
    shot: beat.visualDirection,
    onScreenText: beat.onScreenText,
    narration: beat.narration,
    logo: i === script.beats.length - 1 || i === 0,
  }));

  return {
    aspectRatio: "9:16",
    width: 1080,
    height: 1920,
    withBurnedInSubtitles: true,
    durationSec: script.durationSec,
    srt: buildSrtFromScript(script),
    storyboard,
    toolUiIntro: {
      toolName: input.toolName,
      captureHints: ja
        ? [
            "公式UIの許可範囲内で画面収録（個人情報マスク）",
            "主要機能を縦スクロールで2〜4秒見せる",
            "赤枠ハイライトは自作オーバーレイのみ",
          ]
        : [
            "Capture tool UI within allowed terms (mask PII)",
            "Show 2–4s vertical scroll of core features",
            "Use original highlight overlays only",
          ],
      overlayLabels: ja
        ? ["料金", "用途", "日本語対応", "おすすめ"]
        : ["Pricing", "Use case", "Language", "Best for"],
    },
    logo: {
      watermark: "bottom-right",
      endcard: true,
      safeMarginPx: 96,
      text: "AI BASE",
    },
    backgroundMotion: input.mediaPlan.backgroundMotion,
    bgmCandidates: input.mediaPlan.bgmCandidates.map((b, i) => ({
      id: `bgm-${i + 1}-${b.mood}`,
      mood: b.mood,
      usageNote: b.note,
    })),
    thumbnailCandidates: input.mediaPlan.thumbnailCandidates.map((t, i) => ({
      id: t.title || `thumb-${i + 1}`,
      width: 1080 as const,
      height: 1920 as const,
      textOverlay: t.textOverlay,
      composition: ja
        ? "中央大テロップ・下にAI BASEロゴ・余白確保"
        : "Large center text, AI BASE logo bottom, safe margins",
    })),
    exportChecklist: [
      ...input.mediaPlan.exportHints,
      "Burn-in SRT subtitles (high contrast)",
      "Attach mediaUrl on SocialPost before Content Posting API",
      "Never use uncleared commercial music",
      "Caption + hashtags go to TikTok description field",
    ],
    publishCaption: script.caption,
    publishHashtags: script.hashtags,
    aiBaseCta: script.aiBaseCta,
    status: "awaiting_render",
  };
}

/** Operator-facing publish wait package when API/media not ready. */
export function buildTikTokPublishWaitPackage(input: {
  scripts: TikTokScript[];
  assetPackage: TikTokAssetPackage;
  reason: "awaiting_assets" | "awaiting_api_review";
}) {
  const primary =
    input.scripts.find((s) => s.durationSec === input.assetPackage.durationSec) ??
    input.scripts[1] ??
    input.scripts[0]!;
  return {
    reason: input.reason,
    readyWhen:
      input.reason === "awaiting_assets"
        ? "Attach 9:16 mediaUrl then retry publish"
        : "TikTok app audit / video.publish scope approval",
    description: primary.caption,
    hashtags: primary.hashtags,
    aiBaseCta: primary.aiBaseCta,
    scripts: input.scripts.map((s) => ({
      durationSec: s.durationSec,
      hook: s.hook,
      cta: s.cta,
      beatCount: s.beats.length,
    })),
    assetPackageStatus: input.assetPackage.status,
    noPasswordAutomation: true,
  };
}

/** Attach SRT/storyboard/BGM/thumbs package onto a generated draft bundle. */
export function attachTikTokAssetPackage(
  bundle: TikTokDraftBundle,
  toolName: string,
  locale: "ja" | "en",
): TikTokDraftBundle & { assetPackage: TikTokAssetPackage } {
  const primary =
    bundle.scripts.find((s) => s.durationSec === bundle.durationSec) ??
    bundle.scripts[0]!;
  const assetPackage = generateTikTokAssetPackage({
    toolName,
    locale,
    primaryScript: primary,
    mediaPlan: bundle.mediaPlan,
  });
  const mediaPlan: TikTokMediaPlan = {
    ...bundle.mediaPlan,
    assetPackage,
  };
  return {
    ...bundle,
    mediaPlan,
    assetPackage,
  };
}
