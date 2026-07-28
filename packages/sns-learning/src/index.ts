/**
 * SNS continuous learning — structure/pattern extraction only.
 * Never copy third-party captions, media, audio, or designs.
 * Never invent engagement or revenue metrics.
 */

export type SnsPlatform = "instagram" | "tiktok";
export type SnsLocale = "en" | "ja";

export type TrendObservationInput = {
  platform: SnsPlatform;
  locale: SnsLocale;
  category?: string;
  theme?: string | null;
  hookPattern?: string | null;
  durationSec?: number | null;
  captionDensity?: string | null;
  subtitleStructure?: string | null;
  sceneFlow?: string | null;
  format?: string | null;
  ctaPattern?: string | null;
  hashtagPatterns?: string[];
  postedAtHour?: number | null;
  commentTendency?: string | null;
  /** Engagement — only when provided by official API or operator; otherwise omit/null */
  plays?: number | null;
  likes?: number | null;
  saves?: number | null;
  shares?: number | null;
  comments?: number | null;
  whyItMayWork: string[];
  sourceType: "official_api" | "operator_import" | "seed_structure";
  sourceRef?: string | null;
  confidence?: number;
};

export type ViralPatternDraft = {
  platform: SnsPlatform;
  locale: SnsLocale;
  category: string;
  patternType: string;
  title: string;
  summary: string;
  structure: Record<string, unknown>;
  sampleSize: number;
  confidence: number;
  evidence: Array<{ observationId?: string; note: string }>;
  validUntil: Date;
  analysisPeriodStart?: Date;
  analysisPeriodEnd?: Date;
};

export type ScoreDimension =
  | "trendFit"
  | "hookStrength"
  | "usefulness"
  | "originality"
  | "savePotential"
  | "sharePotential"
  | "profileVisitPotential"
  | "affiliateRelevance"
  | "brandFit"
  | "policyRisk"
  | "copyrightRisk"
  | "hypeRisk";

export type ScoreBreakdown = Record<ScoreDimension, number>;

export type PostScoreResult = {
  total: number;
  breakdown: ScoreBreakdown;
  reasons: string[];
  improvements: string[];
  riskLevel: "low" | "medium" | "high";
  blocked: boolean;
  riskFlags: string[];
};

export type ExperimentPlanDraft = {
  title: string;
  hypothesis: string;
  changeFactor: string;
  fixedFactors: string[];
  platform: SnsPlatform;
  locale: SnsLocale;
  evaluationDays: number;
  successMetric: string;
  minSampleSize: number;
  abortCondition: string;
  variants: Array<{ key: string; label: string; config: Record<string, unknown> }>;
};

export type RecommendationDraft = {
  theme: string;
  platform: SnsPlatform;
  locale: SnsLocale;
  audience: string;
  recommendedHook: string;
  durationSec: number;
  postedAtHint: string;
  cta: string;
  toolId?: string | null;
  affiliateLinkId?: string | null;
  goal: string;
  predictedScore: number;
  rationale: string;
};

/** Exponential decay weight: recent evidence dominates. */
export function decayWeight(
  ageDays: number,
  halfLifeDays: number,
): number {
  if (halfLifeDays <= 0) return 0;
  return Math.pow(0.5, Math.max(0, ageDays) / halfLifeDays);
}

export function assertNoFabricatedMetrics(
  metrics: Record<string, number | null | undefined>,
): void {
  for (const [key, value] of Object.entries(metrics)) {
    if (value === undefined) continue;
    if (value === null) continue;
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      throw new Error(`Invalid metric ${key}: refuse non-finite or negative values`);
    }
  }
}

/**
 * Seed structural catalog — qualitative patterns only, no fake engagement counts.
 * Used when official APIs are not connected so the loop can still be exercised safely.
 */
export function seedStructureObservations(): TrendObservationInput[] {
  return [
    {
      platform: "tiktok",
      locale: "ja",
      category: "ai_tools",
      theme: "AIツール比較（3選）",
      hookPattern: "数字フック（『知らないと損するAI 3選』系）",
      durationSec: 25,
      captionDensity: "medium",
      subtitleStructure: "冒頭テロップ → 箇条書き3点 → CTA",
      sceneFlow: "問題提示 → 解決策列挙 → 保存誘導",
      format: "vertical_video",
      ctaPattern: "保存して後で試す",
      hashtagPatterns: ["#AI", "#効率化"],
      postedAtHour: 20,
      commentTendency: "『2番目どれ？』系の比較質問",
      plays: null,
      likes: null,
      saves: null,
      shares: null,
      comments: null,
      whyItMayWork: [
        "数字で期待値を固定し離脱を遅らせる",
        "比較は保存動機になりやすい",
        "コメント誘発の問いが自然",
      ],
      sourceType: "seed_structure",
      sourceRef: "catalog:tiktok-ja-listicle-3",
      confidence: 0.25,
    },
    {
      platform: "instagram",
      locale: "en",
      category: "ai_tools",
      theme: "Single-tool deep dive workflow",
      hookPattern: "Question hook (What if X took 10 minutes?)",
      durationSec: 35,
      captionDensity: "high",
      subtitleStructure: "Problem → step demo → result → CTA",
      sceneFlow: "Before/after screen recording pattern",
      format: "reel",
      ctaPattern: "Link in bio / profile for full guide",
      hashtagPatterns: ["#AItools", "#productivity"],
      postedAtHour: 12,
      commentTendency: "Tool name requests and pricing questions",
      plays: null,
      likes: null,
      saves: null,
      shares: null,
      comments: null,
      whyItMayWork: [
        "Deep dive builds trust for affiliate clicks",
        "Before/after supports save intent",
        "Profile CTA aligns with Instagram link limits",
      ],
      sourceType: "seed_structure",
      sourceRef: "catalog:ig-en-deepdive",
      confidence: 0.25,
    },
    {
      platform: "tiktok",
      locale: "en",
      category: "ai_tools",
      theme: "Myth-busting AI claims",
      hookPattern: "Contradiction hook (Stop doing X with AI)",
      durationSec: 18,
      captionDensity: "low",
      subtitleStructure: "Bold claim → 2 proofs → soft CTA",
      sceneFlow: "Fast cuts, text-led, no face required",
      format: "vertical_video",
      ctaPattern: "Comment your stack",
      hashtagPatterns: ["#AI", "#buildinpublic"],
      postedAtHour: 18,
      commentTendency: "Agreement / disagreement debates",
      plays: null,
      likes: null,
      saves: null,
      shares: null,
      comments: null,
      whyItMayWork: [
        "Contradiction increases early retention",
        "Short length fits TikTok browsing",
        "Comment CTA boosts distribution signals",
      ],
      sourceType: "seed_structure",
      sourceRef: "catalog:tiktok-en-myth",
      confidence: 0.25,
    },
    {
      platform: "instagram",
      locale: "ja",
      category: "ai_tools",
      theme: "初心者向けAI導入手順",
      hookPattern: "共感フック（『まだ手作業で消耗してない？』）",
      durationSec: 40,
      captionDensity: "high",
      subtitleStructure: "共感 → 3ステップ → 注意点 → プロフィール誘導",
      sceneFlow: "スライド＋短い画面収録",
      format: "reel",
      ctaPattern: "プロフィールの比較表へ",
      hashtagPatterns: ["#ChatGPT", "#仕事効率化"],
      postedAtHour: 21,
      commentTendency: "『初心者でも大丈夫？』系の安心確認",
      plays: null,
      likes: null,
      saves: null,
      shares: null,
      comments: null,
      whyItMayWork: [
        "初心者向けは保存されやすい",
        "安心材料がフォロー転換につながる",
        "プロフィール誘導は成約導線と相性が良い",
      ],
      sourceType: "seed_structure",
      sourceRef: "catalog:ig-ja-beginner",
      confidence: 0.25,
    },
  ];
}

export function extractViralPatterns(
  observations: Array<
    TrendObservationInput & { id?: string; observedAt?: Date }
  >,
  now = new Date(),
): ViralPatternDraft[] {
  const active = observations.filter((o) => o.sourceType !== undefined);
  if (active.length === 0) return [];

  const byKey = new Map<string, typeof active>();
  for (const o of active) {
    const key = `${o.platform}|${o.locale}|${o.theme ?? "general"}`;
    const list = byKey.get(key) ?? [];
    list.push(o);
    byKey.set(key, list);
  }

  const patterns: ViralPatternDraft[] = [];
  const validUntil = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  for (const [, group] of byKey) {
    const first = group[0]!;
    const durations = group
      .map((g) => g.durationSec)
      .filter((d): d is number => typeof d === "number");
    const avgDuration =
      durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : null;

    const ownDataBoost = group.some((g) => g.sourceType === "official_api")
      ? 0.2
      : 0;
    const confidence = Math.min(
      0.85,
      0.15 + group.length * 0.08 + ownDataBoost,
    );

    patterns.push({
      platform: first.platform,
      locale: first.locale,
      category: first.category ?? "ai_tools",
      patternType: "theme_hook_structure",
      title: `${first.platform}/${first.locale}: ${first.theme ?? "general"}`,
      summary:
        "Structure-only pattern. Not a content copy. Treat as hypothesis until own-post metrics confirm.",
      structure: {
        theme: first.theme,
        hookPattern: first.hookPattern,
        avgDurationSec: avgDuration,
        captionDensity: first.captionDensity,
        subtitleStructure: first.subtitleStructure,
        sceneFlow: first.sceneFlow,
        format: first.format,
        ctaPattern: first.ctaPattern,
        beginnerVsAdvanced:
          first.theme?.includes("初心者") || first.theme?.toLowerCase().includes("beginner")
            ? "beginner_leaning"
            : "mixed",
        localeNotes:
          first.locale === "ja"
            ? "Japanese audience often prefers reassurance + save CTA"
            : "English audience often prefers speed + myth-busting hooks",
        platformNotes:
          first.platform === "tiktok"
            ? "Favor shorter cuts and comment CTAs"
            : "Favor profile/link CTAs and save intent",
      },
      sampleSize: group.length,
      confidence,
      evidence: group.map((g) => ({
        observationId: g.id,
        note: (g.whyItMayWork ?? []).slice(0, 2).join("; ") || "structure signal",
      })),
      validUntil,
      analysisPeriodStart: group
        .map((g) => g.observedAt)
        .filter((d): d is Date => !!d)
        .sort((a, b) => a.getTime() - b.getTime())[0],
      analysisPeriodEnd: now,
    });
  }

  // Cross-cutting hook pattern
  const hooks = active
    .map((a) => a.hookPattern)
    .filter((h): h is string => !!h);
  if (hooks.length >= 2) {
    patterns.push({
      platform: active[0]!.platform,
      locale: active[0]!.locale,
      category: "ai_tools",
      patternType: "strong_hooks",
      title: "Hook archetypes (structure)",
      summary: "Common hook shapes across samples — reuse shape, never copy wording.",
      structure: {
        archetypes: [...new Set(hooks)],
        retentionHint: "Front-load conflict, number, or question in first 1–3s",
      },
      sampleSize: hooks.length,
      confidence: Math.min(0.7, 0.2 + hooks.length * 0.05),
      evidence: hooks.slice(0, 5).map((h) => ({ note: h })),
      validUntil,
      analysisPeriodEnd: now,
    });
  }

  return patterns;
}

export function planWeeklyExperiments(
  patterns: Array<{ platform: string; locale: string; title: string; confidence: number }>,
): ExperimentPlanDraft[] {
  const base = patterns[0];
  const platform = (base?.platform === "instagram" ? "instagram" : "tiktok") as SnsPlatform;
  const locale = (base?.locale === "ja" ? "ja" : "en") as SnsLocale;

  return [
    {
      title: "Hook: number vs question",
      hypothesis:
        "A numeric hook outperforms a question hook on 3-second hold when theme and length are fixed.",
      changeFactor: "hook_type",
      fixedFactors: ["theme", "duration_sec", "cta", "platform", "locale"],
      platform,
      locale,
      evaluationDays: 7,
      successMetric: "hold_3sec_rate_then_link_click_rate",
      minSampleSize: 2,
      abortCondition: "If either variant has policy/copyright risk score high, abort.",
      variants: [
        {
          key: "A",
          label: "Number hook",
          config: { hookType: "number", exampleShape: "N AI tools for X" },
        },
        {
          key: "B",
          label: "Question hook",
          config: { hookType: "question", exampleShape: "Still doing X manually?" },
        },
      ],
    },
    {
      title: "Depth: listicle vs single-tool",
      hypothesis:
        "Single-tool deep dive yields higher affiliate click rate than 3-tool listicles at similar reach.",
      changeFactor: "content_depth",
      fixedFactors: ["hook_type", "duration_band", "cta"],
      platform: platform === "tiktok" ? "instagram" : "tiktok",
      locale,
      evaluationDays: 7,
      successMetric: "affiliate_clicks_per_reach",
      minSampleSize: 2,
      abortCondition: "Abort if sample < 2 after 14 days.",
      variants: [
        { key: "A", label: "3-tool list", config: { depth: "list_3" } },
        { key: "B", label: "1-tool deep dive", config: { depth: "single" } },
      ],
    },
  ];
}

export function scoreSocialDraft(input: {
  platform: SnsPlatform;
  locale: SnsLocale;
  theme?: string | null;
  hook?: string | null;
  hookType?: string | null;
  durationSec?: number | null;
  cta?: string | null;
  content: string;
  toolId?: string | null;
  patternConfidenceAvg?: number;
  learningWeight?: number;
}): PostScoreResult {
  const text = `${input.content}\n${input.hook ?? ""}\n${input.cta ?? ""}`.toLowerCase();
  const riskFlags: string[] = [];

  const copyrightRisk =
    /transcript of|copied from|repost this exact|公式音源をそのまま|丸パクリ|無断転載/.test(
      text,
    )
      ? 15
      : 85;
  const policyRisk =
    /guarantee income|必ず稼げる|絶対儲かる|get rich with ai overnight/.test(text)
      ? 20
      : 88;
  const hypeRisk =
    /#1 ai in the world|史上最強|誰でも億万長者/.test(text) ? 25 : 80;

  if (copyrightRisk < 50) riskFlags.push("copyright_risk");
  if (policyRisk < 50) riskFlags.push("policy_risk");
  if (hypeRisk < 50) riskFlags.push("hype_risk");

  const trendFit = Math.round(
    40 + (input.patternConfidenceAvg ?? 0.2) * 50 + (input.learningWeight ?? 0) * 10,
  );
  const hookStrength = input.hook
    ? /[0-9０-９]|\?|？|stop |まだ|損/.test(input.hook.toLowerCase())
      ? 82
      : 65
    : 45;
  const usefulness = /how|手順|比較|workflow|ステップ/.test(text) ? 78 : 58;
  const originality = riskFlags.includes("copyright_risk") ? 20 : 75;
  const savePotential = /checklist|手順|比較|template|保存/.test(text) ? 80 : 55;
  const sharePotential = /myth|誤解|vs |対比/.test(text) ? 76 : 52;
  const profileVisitPotential =
    input.platform === "instagram" && /bio|profile|プロフィール/.test(text)
      ? 78
      : 50;
  const affiliateRelevance = input.toolId ? 82 : 40;
  const brandFit = /ai base|比較|discover|発見/.test(text) ? 85 : 60;

  const breakdown: ScoreBreakdown = {
    trendFit: clampScore(trendFit),
    hookStrength: clampScore(hookStrength),
    usefulness: clampScore(usefulness),
    originality: clampScore(originality),
    savePotential: clampScore(savePotential),
    sharePotential: clampScore(sharePotential),
    profileVisitPotential: clampScore(profileVisitPotential),
    affiliateRelevance: clampScore(affiliateRelevance),
    brandFit: clampScore(brandFit),
    policyRisk: clampScore(policyRisk),
    copyrightRisk: clampScore(copyrightRisk),
    hypeRisk: clampScore(hypeRisk),
  };

  // Risk dimensions invert for total: low risk score means penalty
  const positive = [
    breakdown.trendFit,
    breakdown.hookStrength,
    breakdown.usefulness,
    breakdown.originality,
    breakdown.savePotential,
    breakdown.sharePotential,
    breakdown.profileVisitPotential,
    breakdown.affiliateRelevance,
    breakdown.brandFit,
  ];
  const riskPenalty =
    (100 - breakdown.policyRisk + 100 - breakdown.copyrightRisk + 100 - breakdown.hypeRisk) /
    3;
  const total = Math.round(
    positive.reduce((a, b) => a + b, 0) / positive.length - riskPenalty * 0.35,
  );

  const blocked = riskFlags.length > 0;
  const riskLevel = blocked ? "high" : total < 55 ? "medium" : "low";

  const reasons: string[] = [
    `Hook strength ${breakdown.hookStrength}/100`,
    `Affiliate relevance ${breakdown.affiliateRelevance}/100`,
    `Trend fit uses pattern confidence ${(input.patternConfidenceAvg ?? 0).toFixed(2)} (non-assertive while data is sparse)`,
  ];
  if (blocked) {
    reasons.push(`Auto-held for review due to: ${riskFlags.join(", ")}`);
  }

  const improvements: string[] = [];
  if (breakdown.hookStrength < 70) improvements.push("Strengthen first 1–3s hook (number or tension), without copying others.");
  if (breakdown.affiliateRelevance < 60) improvements.push("Tie CTA to a specific reviewed tool + tracked link.");
  if (breakdown.savePotential < 60) improvements.push("Add a save-worthy structure (checklist, steps, comparison).");
  if ((input.patternConfidenceAvg ?? 0) < 0.4) {
    improvements.push("Treat scores as provisional until own-post metrics accumulate.");
  }

  return {
    total: clampScore(total),
    breakdown,
    reasons,
    improvements,
    riskLevel,
    blocked,
    riskFlags,
  };
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function buildRecommendations(input: {
  patterns: Array<{
    platform: string;
    locale: string;
    title: string;
    summary: string;
    confidence: number;
    structure: Record<string, unknown>;
  }>;
  learning: Array<{
    kind: string;
    title: string;
    importance: number;
    weight: number;
    platform?: string | null;
    locale?: string | null;
  }>;
  tools: Array<{ id: string; slug: string; name: string }>;
  affiliates: Array<{ id: string; toolId: string }>;
}): RecommendationDraft[] {
  const out: RecommendationDraft[] = [];
  for (const pattern of input.patterns.slice(0, 6)) {
    const platform = (pattern.platform === "instagram" ? "instagram" : "tiktok") as SnsPlatform;
    const locale = (pattern.locale === "ja" ? "ja" : "en") as SnsLocale;
    const tool = input.tools[0];
    const affiliate = tool
      ? input.affiliates.find((a) => a.toolId === tool.id)
      : undefined;
    const structure = pattern.structure;
    const successBoost = input.learning
      .filter((l) => l.kind === "success_pattern")
      .reduce((s, l) => s + l.weight * l.importance, 0);
    const failPenalty = input.learning
      .filter((l) => l.kind === "failure_pattern")
      .reduce((s, l) => s + l.weight * l.importance, 0);

    const predictedScore = clampScore(
      45 + pattern.confidence * 40 + successBoost * 15 - failPenalty * 20,
    );

    out.push({
      theme: String(structure.theme ?? pattern.title),
      platform,
      locale,
      audience:
        locale === "ja"
          ? "AIツール検討中のビジネスパーソン"
          : "Operators evaluating AI tools",
      recommendedHook: String(structure.hookPattern ?? "Original tension hook (do not copy)"),
      durationSec: Number(structure.avgDurationSec ?? 25),
      postedAtHint: platform === "tiktok" ? "18:00–21:00 local" : "12:00 or 21:00 local",
      cta: String(
        structure.ctaPattern ??
          (platform === "instagram" ? "Profile link for comparison" : "Comment your use case"),
      ),
      toolId: tool?.id ?? null,
      affiliateLinkId: affiliate?.id ?? null,
      goal: "link_clicks_and_affiliate_conversions",
      predictedScore,
      rationale: [
        pattern.summary,
        `Pattern confidence ${pattern.confidence.toFixed(2)} — provisional until own metrics confirm.`,
        "Optimize for clicks/conversions, not vanity views alone.",
      ].join(" "),
    });
  }
  return out;
}

export function classifyOwnPostOutcome(input: {
  plays?: number | null;
  affiliateClicks?: number | null;
  conversions?: number | null;
  revenue?: number | null;
  saveRate?: number | null;
}): {
  kind: "success_pattern" | "failure_pattern" | "high_views_low_revenue" | "ineffective";
  title: string;
} {
  const plays = input.plays ?? 0;
  const clicks = input.affiliateClicks ?? 0;
  const conversions = input.conversions ?? 0;
  const revenue = input.revenue ?? 0;

  if (conversions > 0 || revenue > 0) {
    return { kind: "success_pattern", title: "Converted to affiliate outcome" };
  }
  if (plays >= 1000 && clicks === 0 && conversions === 0) {
    return {
      kind: "high_views_low_revenue",
      title: "High plays without monetization",
    };
  }
  if ((input.saveRate ?? 0) < 0.01 && plays > 0 && clicks === 0) {
    return { kind: "ineffective", title: "Low save and no clicks" };
  }
  if (plays > 0 && clicks === 0) {
    return { kind: "failure_pattern", title: "Engagement without click intent" };
  }
  return { kind: "ineffective", title: "Insufficient signal — do not overfit" };
}

/**
 * Official API providers — stubs until credentials are configured.
 * They must never scrape; empty result is correct when disconnected.
 */
export type TrendProvider = {
  id: string;
  fetchStructureTrends(input: {
    platform: SnsPlatform;
    locale: SnsLocale;
  }): Promise<TrendObservationInput[]>;
};

export const disconnectedOfficialProviders: TrendProvider[] = [
  {
    id: "instagram_graph_api",
    async fetchStructureTrends() {
      return [];
    },
  },
  {
    id: "tiktok_content_posting_api",
    async fetchStructureTrends() {
      return [];
    },
  },
];
