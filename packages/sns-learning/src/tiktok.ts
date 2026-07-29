/**
 * TikTok-first content generation for AI BASE acquisition + affiliate CV.
 * Structure/scripts/media plans only — never copy third-party creatives.
 */

export const TIKTOK_CONTENT_KINDS = [
  "tool_intro",
  "compare",
  "ranking",
  "ai_news",
  "howto",
  "failure",
  "before_after",
  "beginner",
] as const;

export type TikTokContentKind = (typeof TIKTOK_CONTENT_KINDS)[number];

export const TIKTOK_DURATIONS = [15, 30, 60] as const;
export type TikTokDurationSec = (typeof TIKTOK_DURATIONS)[number];

export type TikTokScriptBeat = {
  tStart: number;
  tEnd: number;
  narration: string;
  onScreenText: string;
  visualDirection: string;
};

export type TikTokScript = {
  durationSec: TikTokDurationSec;
  contentKind: TikTokContentKind;
  hook: string;
  hookWindowSec: number;
  beats: TikTokScriptBeat[];
  cta: string;
  hashtags: string[];
  aiBaseCta: string;
  caption: string;
};

export type TikTokMediaPlan = {
  aspectRatio: "9:16";
  resolutionHint: "1080x1920";
  withSubtitles: true;
  scenes: Array<{
    order: number;
    durationSec: number;
    type: "hook_card" | "tool_ui" | "compare_cards" | "logo" | "cta_endcard";
    description: string;
    overlayText: string;
  }>;
  logoPlacement: "bottom-right watermark + endcard";
  backgroundMotion: string[];
  bgmCandidates: Array<{ mood: string; note: string }>;
  thumbnailCandidates: Array<{ title: string; textOverlay: string }>;
  exportHints: string[];
  /** Filled by attachTikTokAssetPackage() */
  assetPackage?: import("./tiktok-assets.js").TikTokAssetPackage;
};

export type TikTokDraftBundle = {
  contentKind: TikTokContentKind;
  theme: string;
  hook: string;
  hookType: string;
  durationSec: TikTokDurationSec;
  cta: string;
  hashtags: string[];
  format: "vertical_video";
  captionDensity: "low" | "medium" | "high";
  subtitleDensity: "low" | "medium" | "high";
  content: string;
  scripts: TikTokScript[];
  mediaPlan: TikTokMediaPlan;
  postedAtHint: string;
};

const KIND_META: Record<
  TikTokContentKind,
  { ja: string; en: string; hookType: string }
> = {
  tool_intro: { ja: "AIツール紹介", en: "AI tool intro", hookType: "curiosity" },
  compare: { ja: "比較", en: "Comparison", hookType: "number" },
  ranking: { ja: "ランキング", en: "Ranking", hookType: "number" },
  ai_news: { ja: "AIニュース", en: "AI news", hookType: "urgency" },
  howto: { ja: "使い方", en: "How-to", hookType: "question" },
  failure: { ja: "失敗例", en: "Failure cases", hookType: "empathy" },
  before_after: { ja: "ビフォーアフター", en: "Before/after", hookType: "contrast" },
  beginner: { ja: "初心者向け解説", en: "Beginner guide", hookType: "empathy" },
};

function siteBase(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://ai-base-beta.vercel.app"
  );
}

function hashtagsFor(
  kind: TikTokContentKind,
  locale: "ja" | "en",
  toolName?: string,
): string[] {
  const base =
    locale === "ja"
      ? ["#AI", "#AIツール", "#効率化", "#AI BASE"]
      : ["#AI", "#AItools", "#productivity", "#AIBASE"];
  if (toolName) base.push(`#${toolName.replace(/\s+/g, "")}`);
  if (kind === "beginner") base.push(locale === "ja" ? "#初心者" : "#beginner");
  if (kind === "compare" || kind === "ranking") {
    base.push(locale === "ja" ? "#比較" : "#comparison");
  }
  return base.slice(0, 8);
}

function hookFor(
  kind: TikTokContentKind,
  locale: "ja" | "en",
  toolName: string,
): string {
  if (locale === "ja") {
    switch (kind) {
      case "tool_intro":
        return `${toolName}、まだ使ってない人いる？`;
      case "compare":
        return `知らないと損するAI比較【${toolName}編】`;
      case "ranking":
        return `今使うべきAIツール3選（本当に）`;
      case "ai_news":
        return `今日知らないと置いていかれるAIニュース`;
      case "howto":
        return `${toolName}の正しい使い方、30秒で`;
      case "failure":
        return `AI導入で失敗する人の共通点`;
      case "before_after":
        return `${toolName}導入前と後、差がエグい`;
      case "beginner":
        return `AI初心者が最初にやるべきこと`;
    }
  }
  switch (kind) {
    case "tool_intro":
      return `Still not using ${toolName}?`;
    case "compare":
      return `Stop guessing — compare ${toolName} fast`;
    case "ranking":
      return `3 AI tools worth your stack right now`;
    case "ai_news":
      return `AI update you shouldn't ignore today`;
    case "howto":
      return `${toolName} in 30 seconds — do this`;
    case "failure":
      return `Why most AI rollouts fail`;
    case "before_after":
      return `Before vs after ${toolName}`;
    case "beginner":
      return `If you're new to AI, start here`;
  }
}

function buildBeats(
  durationSec: TikTokDurationSec,
  kind: TikTokContentKind,
  locale: "ja" | "en",
  toolName: string,
  hook: string,
): TikTokScriptBeat[] {
  const ja = locale === "ja";
  const mid = Math.round(durationSec * 0.45);
  const ctaStart = Math.max(durationSec - 8, mid + 2);

  const bodyNarration =
    kind === "compare" || kind === "ranking"
      ? ja
        ? `${toolName}を含む候補を料金・用途でざっくり比較。詳しくはAI BASE。`
        : `Quick compare including ${toolName} by pricing and fit — full table on AI BASE.`
      : kind === "failure"
        ? ja
          ? `よくある失敗: 目的なし導入、プロンプト丸投げ、料金未確認。`
          : `Common fails: no goal, prompt dumping, ignoring pricing.`
        : kind === "before_after"
          ? ja
            ? `Before: 手作業で消耗。After: ${toolName}で下書き→人が確認。`
            : `Before: manual grind. After: ${toolName} draft → human check.`
          : ja
            ? `${toolName}の要点を画面で見せつつ、導入の判断材料を提示。`
            : `Show ${toolName} UI highlights and decision criteria.`;

  return [
    {
      tStart: 0,
      tEnd: Math.min(2, durationSec),
      narration: hook,
      onScreenText: hook,
      visualDirection: ja
        ? "縦画面フルテロップ、強コントラスト、0.5秒で顔なしテキストイン"
        : "Full-bleed vertical text card, high contrast, no face required",
    },
    {
      tStart: Math.min(2, durationSec),
      tEnd: mid,
      narration: bodyNarration,
      onScreenText: ja ? `${toolName} をチェック` : `Check ${toolName}`,
      visualDirection: ja
        ? "AIツール画面収録 / モックUI・スクロール・ポイントに赤枠"
        : "Tool UI capture / mock scroll with highlight boxes",
    },
    {
      tStart: mid,
      tEnd: ctaStart,
      narration: ja
        ? `保存して後で見返せるように。比較表はAI BASEにまとめてある。`
        : `Save this. Full comparisons live on AI BASE.`,
      onScreenText: ja ? "保存推奨" : "Save this",
      visualDirection: ja
        ? "箇条書きテロップ2〜3行、ロゴ小さめ透かし"
        : "2–3 bullet overlays + soft logo watermark",
    },
    {
      tStart: ctaStart,
      tEnd: durationSec,
      narration: ja
        ? `詳しくはプロフィール／AI BASEへ。計測リンクからどうぞ。`
        : `Details on AI BASE — use the tracked link in profile.`,
      onScreenText: ja ? "AI BASEで比較 →" : "Compare on AI BASE →",
      visualDirection: ja
        ? "エンドカード：AI BASEロゴ＋短いURL誘導"
        : "Endcard: AI BASE logo + short CTA",
    },
  ];
}

export function generateTikTokScript(input: {
  contentKind: TikTokContentKind;
  durationSec: TikTokDurationSec;
  locale: "ja" | "en";
  toolName: string;
  toolSlug?: string;
}): TikTokScript {
  const hook = hookFor(input.contentKind, input.locale, input.toolName);
  const tags = hashtagsFor(input.contentKind, input.locale, input.toolName);
  const aiBaseCta =
    input.locale === "ja"
      ? `AIツールの比較・料金・日本語対応は AI BASE で → ${siteBase()}/tools/${input.toolSlug ?? ""}`
      : `Compare pricing & fit on AI BASE → ${siteBase()}/tools/${input.toolSlug ?? ""}`;
  const cta =
    input.locale === "ja"
      ? "保存＆プロフィールからAI BASEへ"
      : "Save + open AI BASE from profile";
  const beats = buildBeats(
    input.durationSec,
    input.contentKind,
    input.locale,
    input.toolName,
    hook,
  );
  const caption = [
    hook,
    "",
    aiBaseCta,
    "",
    tags.join(" "),
  ].join("\n");

  return {
    durationSec: input.durationSec,
    contentKind: input.contentKind,
    hook,
    hookWindowSec: 2,
    beats,
    cta,
    hashtags: tags,
    aiBaseCta,
    caption,
  };
}

export function generateTikTokMediaPlan(input: {
  contentKind: TikTokContentKind;
  locale: "ja" | "en";
  toolName: string;
  primaryScript: TikTokScript;
}): TikTokMediaPlan {
  const ja = input.locale === "ja";
  const d = input.primaryScript.durationSec;
  return {
    aspectRatio: "9:16",
    resolutionHint: "1080x1920",
    withSubtitles: true,
    scenes: [
      {
        order: 1,
        durationSec: Math.min(2, d),
        type: "hook_card",
        description: ja ? "フック用フルスクリーンカード" : "Hook full-screen card",
        overlayText: input.primaryScript.hook,
      },
      {
        order: 2,
        durationSec: Math.max(4, Math.round(d * 0.4)),
        type: "tool_ui",
        description: ja
          ? `${input.toolName}の画面紹介（スクロール・主要機能）`
          : `${input.toolName} UI walkthrough`,
        overlayText: input.toolName,
      },
      {
        order: 3,
        durationSec: Math.max(3, Math.round(d * 0.25)),
        type: "compare_cards",
        description: ja
          ? "料金 / 用途 / 向き不向きの短カード"
          : "Pricing / use-case / fit cards",
        overlayText: ja ? "比較ポイント" : "Key diffs",
      },
      {
        order: 4,
        durationSec: Math.min(5, Math.max(3, d - 10)),
        type: "cta_endcard",
        description: ja ? "AI BASE誘導エンドカード" : "AI BASE CTA endcard",
        overlayText: ja ? "AI BASEで詳しく" : "See AI BASE",
      },
      {
        order: 5,
        durationSec: 1,
        type: "logo",
        description: "AI BASE logo lockup",
        overlayText: "AI BASE",
      },
    ],
    logoPlacement: "bottom-right watermark + endcard",
    backgroundMotion: ja
      ? ["ゆっくりパンするグラデーション", "UI画面の縦スクロール", "軽いパーティクルなしで視線集中"]
      : ["slow gradient pan", "UI vertical scroll", "minimal motion for focus"],
    bgmCandidates: [
      {
        mood: "upbeat-focus",
        note: ja
          ? "権利クリアなロイヤリティフリー。公式音源の無断利用禁止"
          : "Royalty-free only. Never use uncleared official audio",
      },
      {
        mood: "soft-tech",
        note: ja ? "ナレーション優先で音量は控えめ" : "Keep under narration",
      },
    ],
    thumbnailCandidates: [
      {
        title: "hook-thumb",
        textOverlay: input.primaryScript.hook.slice(0, 28),
      },
      {
        title: "tool-name-thumb",
        textOverlay: input.toolName,
      },
      {
        title: "cta-thumb",
        textOverlay: ja ? "AI BASEで比較" : "Compare on AI BASE",
      },
    ],
    exportHints: [
      "9:16 H.264, 1080x1920, burned-in captions preferred",
      "Keep safe margins for TikTok UI chrome",
      "Export caption + hashtags separately for API/description field",
    ],
  };
}

export function generateTikTokDraftBundle(input: {
  contentKind: TikTokContentKind;
  locale: "ja" | "en";
  toolName: string;
  toolSlug?: string;
  preferredDuration?: TikTokDurationSec;
  learningHints?: {
    preferredHookType?: string | null;
    preferredDurationSec?: number | null;
    preferredCta?: string | null;
    preferredPostedAtHint?: string | null;
    preferredSubtitleDensity?: "low" | "medium" | "high" | null;
  };
}): TikTokDraftBundle {
  const preferred =
    input.preferredDuration ??
    (input.learningHints?.preferredDurationSec &&
    TIKTOK_DURATIONS.includes(
      input.learningHints.preferredDurationSec as TikTokDurationSec,
    )
      ? (input.learningHints.preferredDurationSec as TikTokDurationSec)
      : 30);

  const scripts = TIKTOK_DURATIONS.map((durationSec) =>
    generateTikTokScript({
      contentKind: input.contentKind,
      durationSec,
      locale: input.locale,
      toolName: input.toolName,
      toolSlug: input.toolSlug,
    }),
  );
  const primary =
    scripts.find((s) => s.durationSec === preferred) ?? scripts[1]!;
  const mediaPlan = generateTikTokMediaPlan({
    contentKind: input.contentKind,
    locale: input.locale,
    toolName: input.toolName,
    primaryScript: primary,
  });

  const meta = KIND_META[input.contentKind];
  const theme = `${meta[input.locale]}: ${input.toolName}`;
  const subtitleDensity =
    input.learningHints?.preferredSubtitleDensity ??
    (preferred <= 15 ? "high" : preferred >= 60 ? "medium" : "high");

  // Apply learned CTA override onto primary caption when present
  if (input.learningHints?.preferredCta) {
    primary.cta = input.learningHints.preferredCta;
  }

  const content = [
    primary.caption,
    "",
    input.locale === "ja" ? "【台本バリエーション】" : "[Script variants]",
    ...scripts.map(
      (s) =>
        `- ${s.durationSec}s hook: ${s.hook} / CTA: ${s.cta}`,
    ),
    "",
    input.locale === "ja"
      ? "【素材】9:16 / 字幕SRT / ストーリーボード / BGM・サムネ候補"
      : "[Assets] 9:16 / SRT / storyboard / BGM & thumb candidates",
  ].join("\n");

  return {
    contentKind: input.contentKind,
    theme,
    hook: primary.hook,
    hookType: input.learningHints?.preferredHookType || meta.hookType,
    durationSec: primary.durationSec,
    cta: input.learningHints?.preferredCta || primary.cta,
    hashtags: primary.hashtags,
    format: "vertical_video",
    captionDensity: preferred <= 15 ? "low" : "medium",
    subtitleDensity,
    content,
    scripts,
    mediaPlan,
    postedAtHint:
      input.learningHints?.preferredPostedAtHint || "18:00–21:00 local (TikTok peak)",
  };
}

/** Reflect winning TikTok posts into next-draft preferences (revenue-first). */
export function extractTikTokLearningHints(input: {
  posts: Array<{
    hookType?: string | null;
    durationSec?: number | null;
    theme?: string | null;
    cta?: string | null;
    subtitleDensity?: string | null;
    publishedAt?: Date | null;
    metrics?: Array<{
      plays?: number | null;
      affiliateClicks?: number | null;
      conversions?: number | null;
      revenue?: number | null;
      hold3SecRate?: number | null;
      completionRate?: number | null;
    }>;
    scriptJson?: { beats?: unknown } | null;
  }>;
}): {
  preferredHookType: string | null;
  preferredDurationSec: number | null;
  preferredTheme: string | null;
  preferredCta: string | null;
  preferredSubtitleDensity: "low" | "medium" | "high" | null;
  preferredPostedAtHint: string | null;
  preferredScriptShape: string | null;
  sampleSize: number;
} {
  const scored = input.posts
    .map((p) => {
      const m = p.metrics?.[0];
      const score =
        (m?.conversions ?? 0) * 1000 +
        (m?.revenue ?? 0) * 10 +
        (m?.affiliateClicks ?? 0) * 20 +
        (m?.hold3SecRate ?? 0) * 5 +
        (m?.completionRate ?? 0) * 3 +
        Math.log10((m?.plays ?? 0) + 1);
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const top = scored.slice(0, 5).map((x) => x.p);
  if (top.length === 0) {
    return {
      preferredHookType: null,
      preferredDurationSec: 30,
      preferredTheme: null,
      preferredCta: null,
      preferredSubtitleDensity: "high",
      preferredPostedAtHint: "18:00–21:00 local (TikTok peak)",
      preferredScriptShape: "hook(0-2s) → value → save CTA → AI BASE",
      sampleSize: 0,
    };
  }

  const mode = <T extends string | number>(vals: Array<T | null | undefined>) => {
    const counts = new Map<string, number>();
    for (const v of vals) {
      if (v == null) continue;
      const k = String(v);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    let best: string | null = null;
    let n = 0;
    for (const [k, c] of counts) {
      if (c > n) {
        best = k;
        n = c;
      }
    }
    return best;
  };

  const hours = top
    .map((p) => (p.publishedAt ? p.publishedAt.getHours() : null))
    .filter((h): h is number => h != null);
  const hourMode = mode(hours);
  const postedAtHint = hourMode
    ? `${hourMode}:00–${(Number(hourMode) + 2) % 24}:00 local (learned)`
    : "18:00–21:00 local (TikTok peak)";

  const beatCount = top
    .map((p) =>
      Array.isArray((p.scriptJson as { beats?: unknown } | null)?.beats)
        ? ((p.scriptJson as { beats: unknown[] }).beats.length)
        : null,
    )
    .filter((n): n is number => n != null);

  return {
    preferredHookType: mode(top.map((p) => p.hookType)),
    preferredDurationSec: Number(mode(top.map((p) => p.durationSec))) || 30,
    preferredTheme: mode(top.map((p) => p.theme)),
    preferredCta: mode(top.map((p) => p.cta)),
    preferredSubtitleDensity: (mode(top.map((p) => p.subtitleDensity)) as
      | "low"
      | "medium"
      | "high"
      | null) ?? "high",
    preferredPostedAtHint: postedAtHint,
    preferredScriptShape:
      beatCount.length > 0
        ? `learned ~${Math.round(beatCount.reduce((a, b) => a + b, 0) / beatCount.length)} beats`
        : "hook(0-2s) → value → save CTA → AI BASE",
    sampleSize: top.length,
  };
}

export const SOCIAL_POST_STATUSES = [
  "draft",
  "pending_approval",
  "ready",
  "scheduled",
  "published",
  "failed",
  "retry",
  "rejected",
] as const;

export type SocialPostStatus = (typeof SOCIAL_POST_STATUSES)[number];

/** Primary acquisition platforms + future stubs. */
export const SNS_ACQUISITION_PLATFORMS = [
  "tiktok",
  "instagram",
  "x",
  "threads",
  "note",
  "linkedin",
] as const;

export type SnsAcquisitionPlatform = (typeof SNS_ACQUISITION_PLATFORMS)[number];
