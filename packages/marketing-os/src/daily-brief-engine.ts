import type { BrandMemory } from "./types.js";
import type { HandleRow } from "./brand-engine.js";
import { tokyoDateKey } from "./persona.js";

export type ImprovementRow = {
  dateKey: string;
  title: string;
  cause: string;
  action: string;
  result: string;
  platform?: string | null;
};

export type YesterdayMetric = {
  platform: string;
  followersDelta: number;
  saveRateDeltaPct: number;
  improvementCount: number;
};

export type TodayMission = {
  rank: number;
  title: string;
  detail: string;
  deepLink?: string;
  why: string;
};

export type DailyBriefPlan = {
  version: "employee-v3";
  greetingName: string;
  brandName: string;
  yesterday: {
    headline: string;
    /** Empty until snsMetrics capability is ready */
    metrics: YesterdayMetric[];
    metricsStatus: "ready" | "pending";
    metricsNote: string;
    improvements: ImprovementRow[];
    cause: string;
    lesson: string;
    /** Real AI SCORE delta when available */
    scoreOverall: number | null;
    scoreDelta: number | null;
  };
  missions: TodayMission[];
  expectedEffect: {
    status: "ready" | "pending";
    followersMin?: number;
    followersMax?: number;
    note: string;
  };
  nextActions: Array<{ title: string; why: string; deepLink?: string }>;
};

function brandOr(brand: BrandMemory | null, key: keyof BrandMemory, fallback: string) {
  const v = brand?.[key]?.trim();
  return v || fallback;
}

function greetingPrefix(d = new Date()): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Tokyo",
      hour: "numeric",
      hour12: false,
    }).format(d),
  );
  if (hour < 11) return "おはようございます";
  if (hour < 18) return "こんにちは";
  return "お疲れさまです";
}

/**
 * Scaffold for LLM brief only — no fabricated follower/save numbers.
 * Missions are placeholders refined by the LLM when available.
 */
export function buildEmployeeDailyBriefScaffold(input: {
  brand: BrandMemory | null;
  handles: HandleRow[];
  ownerName: string | null;
  workspaceId: string;
  dateKey?: string;
  improvements: ImprovementRow[];
  scoreOverall: number | null;
  scoreDelta: number | null;
}): DailyBriefPlan {
  const dateKey = input.dateKey ?? tokyoDateKey();
  void dateKey;
  void input.workspaceId;
  void input.handles;

  const brandName = brandOr(input.brand, "brandName", "ブランド");
  const audience = brandOr(input.brand, "targetAudience", "ターゲット");
  const concept = brandOr(input.brand, "concept", "コンセプト");
  const worldview = brandOr(input.brand, "worldview", "世界観");
  const products = brandOr(input.brand, "products", "商品");
  const goals = brandOr(input.brand, "goals", "成長");
  const competitors = brandOr(input.brand, "competitors", "競合");
  const tone = brandOr(input.brand, "postTone", "丁寧");
  const greetingName =
    input.ownerName?.trim() ||
    brandName.replace(/(株式会社|有限会社|合同会社)/g, "").trim() ||
    "あなた";

  const recentImprovements = input.improvements.slice(0, 3);
  const cause = recentImprovements[0]?.cause
    ? recentImprovements[0].cause
    : `「${concept}」が${audience}に一瞬で伝わっていないと、保存もフォローも伸びにくい状態です。`;
  const lesson = recentImprovements[0]?.result
    ? `学び: ${recentImprovements[0].title} → ${recentImprovements[0].result}`
    : `学び: 世界観「${worldview}」と商品「${products}」をセットで見せると、目標「${goals}」に近づきます。`;

  const missions: TodayMission[] = [
    {
      rank: 1,
      title: "今日の投稿を1本、作成してコピー投稿する",
      detail: `フックは「${audience}が保存したくなる${concept}」。トーンは${tone}。`,
      deepLink: "/admin/create",
      why: "初見の保存がフォローの入口になるため",
    },
    {
      rank: 2,
      title: "リール用の15〜35秒構成を確定して撮影する",
      detail: `0–3秒で悩み→${brandName}の${concept}で解決ヒント→プロフィール誘導`,
      deepLink: "/admin/studio",
      why: "リールは新規リーチの主戦場です",
    },
    {
      rank: 3,
      title: `競合「${competitors}」の差分を1つ決める`,
      detail: "保存されやすい投稿を3本メモし、自ブランドのトーンへ翻訳する",
      deepLink: "/admin/analysis#competitor",
      why: "真似ではなく差分の検証が成長を加速します",
    },
  ];

  return {
    version: "employee-v3",
    greetingName,
    brandName,
    yesterday: {
      headline: "昨日の振り返りです。",
      metrics: [],
      metricsStatus: "pending",
      metricsNote: "フォロワー・保存率などのSNS実測値は準備中です（SNSインサイト連携後に表示）。",
      improvements: recentImprovements,
      cause,
      lesson,
      scoreOverall: input.scoreOverall,
      scoreDelta: input.scoreDelta,
    },
    missions,
    expectedEffect: {
      status: "pending",
      note: "フォロワー増加の数値予測は、SNS実測データ連携後に表示します（準備中）。",
    },
    nextActions: missions.map((m) => ({
      title: m.title,
      why: m.why,
      deepLink: m.deepLink,
    })),
  };
}

/** @deprecated use buildEmployeeDailyBriefScaffold — kept name for call-site compatibility */
export function buildEmployeeDailyBrief(input: {
  brand: BrandMemory | null;
  handles: HandleRow[];
  ownerName: string | null;
  workspaceId: string;
  dateKey?: string;
  improvements: ImprovementRow[];
  scoreOverall: number | null;
  scoreDelta: number | null;
}): { content: string; plan: DailyBriefPlan } {
  const plan = buildEmployeeDailyBriefScaffold(input);
  const scoreLine =
    plan.yesterday.scoreOverall != null
      ? `AI SCORE: ${plan.yesterday.scoreOverall}${
          plan.yesterday.scoreDelta != null
            ? `（前日比 ${plan.yesterday.scoreDelta >= 0 ? "+" : ""}${plan.yesterday.scoreDelta}）`
            : ""
        }`
      : "AI SCORE: 未算出";

  const improvementHistory =
    plan.yesterday.improvements.length > 0
      ? [
          ``,
          `■ 改善履歴（学習中）`,
          ...plan.yesterday.improvements.map((i) => {
            const d = i.dateKey.slice(5).replace("-", "/");
            return `${d}\n${i.title}\n結果\n${i.result || "計測中"}`;
          }),
        ]
      : [];

  const content = [
    `${greetingPrefix()}、${plan.greetingName}さん。`,
    ``,
    plan.yesterday.headline,
    scoreLine,
    plan.yesterday.metricsNote,
    ``,
    `【原因】`,
    plan.yesterday.cause,
    ``,
    `【改善案】`,
    plan.yesterday.lesson,
    ``,
    `【実行】今日やるべきこと`,
    ``,
    ...plan.missions.map(
      (m) =>
        `${["①", "②", "③"][m.rank - 1] ?? `${m.rank}.`}${m.title}\n　${m.detail}`,
    ),
    ``,
    plan.expectedEffect.note,
    ``,
    `担当ブランド「${plan.brandName}」の記憶を前提に提案しています。`,
    ...improvementHistory,
    ``,
    `何を手伝いましょうか？`,
  ].join("\n");

  return { content, plan };
}

/** Task completion result — no fabricated % lifts. */
export function estimateResultForTask(_title: string, _category: string): string {
  return "計測待ち（SNSインサイト連携後に自動更新）";
}
