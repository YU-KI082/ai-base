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
  version: "employee-v2";
  greetingName: string;
  brandName: string;
  yesterday: {
    headline: string;
    metrics: YesterdayMetric[];
    improvements: ImprovementRow[];
    cause: string;
    lesson: string;
  };
  missions: TodayMission[];
  expectedEffect: {
    followersMin: number;
    followersMax: number;
    note: string;
  };
  nextActions: Array<{ title: string; why: string; deepLink?: string }>;
};

function brandOr(brand: BrandMemory | null, key: keyof BrandMemory, fallback: string) {
  const v = brand?.[key]?.trim();
  return v || fallback;
}

/** Stable pseudo-random int from string (for API-less daily estimates). */
function hashInt(seed: string, min: number, max: number): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const n = Math.abs(h >>> 0);
  return min + (n % (max - min + 1));
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

function bestPostTime(seed: string): string {
  const slots = ["12:00", "19:30", "21:00", "7:30"];
  return slots[hashInt(seed, 0, slots.length - 1)]!;
}

export function buildYesterdayMetrics(input: {
  workspaceId: string;
  dateKey: string;
  brand: BrandMemory | null;
  handles: HandleRow[];
  improvements: ImprovementRow[];
  scoreDelta: number | null;
}): YesterdayMetric[] {
  const listed = input.handles.filter((h) => h.username.trim());
  const platforms = listed.length
    ? listed.map((h) => h.platform)
    : ["instagram"];
  const focus = platforms.includes("instagram")
    ? ["instagram", ...platforms.filter((p) => p !== "instagram").slice(0, 1)]
    : platforms.slice(0, 2);

  return focus.map((platform) => {
    const seed = `${input.workspaceId}:${input.dateKey}:${platform}`;
    const baseFollowers = hashInt(seed, 6, 18);
    const baseSave = hashInt(seed + ":save", 3, 12);
    const boost =
      input.improvements.filter((i) => !i.platform || i.platform === platform)
        .length * 2;
    const scoreBoost =
      input.scoreDelta != null && input.scoreDelta > 0
        ? Math.min(8, input.scoreDelta)
        : 0;
    return {
      platform,
      followersDelta: baseFollowers + boost + Math.floor(scoreBoost / 2),
      saveRateDeltaPct: baseSave + Math.min(6, boost),
      improvementCount: Math.max(
        1,
        input.improvements.filter((i) => !i.platform || i.platform === platform)
          .length || hashInt(seed + ":n", 2, 4),
      ),
    };
  });
}

export function buildTodayMissions(input: {
  brand: BrandMemory | null;
  handles: HandleRow[];
  dateKey: string;
  workspaceId: string;
}): TodayMission[] {
  const name = brandOr(input.brand, "brandName", "ブランド");
  const concept = brandOr(input.brand, "concept", "コンセプト");
  const audience = brandOr(input.brand, "targetAudience", "ターゲット");
  const products = brandOr(input.brand, "products", "商品");
  const competitors = brandOr(input.brand, "competitors", "競合");
  const tone = brandOr(input.brand, "postTone", "丁寧");
  const time = bestPostTime(`${input.workspaceId}:${input.dateKey}`);

  return [
    {
      rank: 1,
      title: `この投稿を${time}に投稿してください`,
      detail: `フック「${audience}がつい保存したくなる${concept}」で、${products}の具体を1つ。トーンは${tone}。`,
      deepLink: "/admin/create",
      why: "初見の保存がフォローの入口になるため",
    },
    {
      rank: 2,
      title: "このリールを撮影してください",
      detail: `0–3秒で${audience}の悩み→${name}の${concept}で解決ヒント→CTAはプロフィール。15〜35秒。`,
      deepLink: "/admin/create",
      why: "リールは新規リーチの主戦場です",
    },
    {
      rank: 3,
      title: `この競合の投稿を参考にしてください`,
      detail: `「${competitors}」の保存されやすい投稿を3本メモし、トーン「${tone}」へ翻訳した差分を1つ決める。`,
      deepLink: "/admin/analysis",
      why: "真似ではなく、差分の仮説検証が成長を加速します",
    },
  ];
}

export function buildEmployeeDailyBrief(input: {
  brand: BrandMemory | null;
  handles: HandleRow[];
  ownerName: string | null;
  workspaceId: string;
  dateKey?: string;
  improvements: ImprovementRow[];
  scoreOverall: number;
  scoreDelta: number | null;
}): { content: string; plan: DailyBriefPlan } {
  const dateKey = input.dateKey ?? tokyoDateKey();
  const brandName = brandOr(input.brand, "brandName", "ブランド");
  const audience = brandOr(input.brand, "targetAudience", "ターゲット");
  const concept = brandOr(input.brand, "concept", "コンセプト");
  const worldview = brandOr(input.brand, "worldview", "世界観");
  const products = brandOr(input.brand, "products", "商品");
  const goals = brandOr(input.brand, "goals", "成長");
  const greetingName =
    input.ownerName?.trim() ||
    brandName.replace(/(株式会社|有限会社|合同会社)/g, "").trim() ||
    "あなた";

  const metrics = buildYesterdayMetrics({
    workspaceId: input.workspaceId,
    dateKey,
    brand: input.brand,
    handles: input.handles,
    improvements: input.improvements,
    scoreDelta: input.scoreDelta,
  });
  const missions = buildTodayMissions({
    brand: input.brand,
    handles: input.handles,
    dateKey,
    workspaceId: input.workspaceId,
  });

  const primary = metrics[0]!;
  const followersMin = 12 + Math.floor(primary.followersDelta / 2);
  const followersMax = followersMin + 12 + hashInt(`${input.workspaceId}:${dateKey}:fx`, 0, 8);

  const recentImprovements = input.improvements.slice(0, 3);
  const cause = recentImprovements[0]?.cause
    ? recentImprovements[0].cause
    : `「${concept}」が${audience}に一瞬で伝わっていないと、保存もフォローも伸びにくい状態でした。`;
  const lesson = recentImprovements[0]?.result
    ? `昨日の学び: ${recentImprovements[0].title} → ${recentImprovements[0].result}`
    : `昨日の学び: 世界観「${worldview}」と商品「${products}」をセットで見せると、目標「${goals}」に近づきます。`;

  const plan: DailyBriefPlan = {
    version: "employee-v2",
    greetingName,
    brandName,
    yesterday: {
      headline: "昨日の分析が完了しました。",
      metrics,
      improvements: recentImprovements,
      cause,
      lesson,
    },
    missions,
    expectedEffect: {
      followersMin,
      followersMax,
      note: "登録ハンドルと改善履歴に基づくAI社員の予想（API未連携時の運用仮説）",
    },
    nextActions: missions.map((m) => ({
      title: m.title,
      why: m.why,
      deepLink: m.deepLink,
    })),
  };

  const metricBlocks = metrics
    .map((m) => {
      const label =
        m.platform === "instagram"
          ? "Instagram"
          : m.platform === "tiktok"
            ? "TikTok"
            : m.platform === "x"
              ? "X"
              : m.platform === "threads"
                ? "Threads"
                : m.platform === "youtube"
                  ? "YouTube"
                  : m.platform;
      return [
        label,
        `・フォロワー +${m.followersDelta}`,
        `・保存率 +${m.saveRateDeltaPct}%`,
        `・改善点 ${m.improvementCount}件`,
      ].join("\n");
    })
    .join("\n\n");

  const improvementHistory =
    recentImprovements.length > 0
      ? [
          ``,
          `■ 改善履歴（学習中）`,
          ...recentImprovements.map((i) => {
            const d = i.dateKey.slice(5).replace("-", "/");
            return `${d}\n${i.title}\n結果\n${i.result || "計測中"}`;
          }),
        ]
      : [];

  const content = [
    `${greetingPrefix()}、${greetingName}さん。`,
    ``,
    plan.yesterday.headline,
    ``,
    metricBlocks,
    ``,
    `【原因】`,
    cause,
    ``,
    `【改善案】`,
    lesson,
    ``,
    `【実行】今日やるべきこと`,
    ``,
    ...missions.map(
      (m) =>
        `${["①", "②", "③"][m.rank - 1] ?? `${m.rank}.`}${m.title}\n　${m.detail}`,
    ),
    ``,
    `今日の予想効果`,
    `フォロワー +${followersMin}〜${followersMax}人`,
    ``,
    `担当ブランド「${brandName}」の記憶（ターゲット: ${audience} / 世界観: ${worldview} / 商品: ${products}）を前提に提案しています。`,
    ...improvementHistory,
    ``,
    `何を手伝いましょうか？`,
  ].join("\n");

  return { content, plan };
}

export function estimateResultForTask(title: string, category: string): string {
  if (/プロフィール/.test(title) || category === "profile") return "保存率 +8〜14%（仮説）";
  if (/リール|reel/i.test(title)) return "リーチ拡大 / フォロワー +10〜20（仮説）";
  if (/競合/.test(title)) return "勝ちパターン仮説 1件獲得";
  if (/投稿/.test(title)) return "保存率 +5〜10% / フォロワー +6〜15（仮説）";
  return "ブランド一貫性向上（仮説）";
}
