import type { BrandMemory, OsPlatform } from "./types.js";
import type {
  BrandPhotoPreset,
  PhotoAnalysis,
  PhotoEnhanceOp,
  PhotoEnhanceRecipe,
  PhotoPostVariant,
  PhotoPredictions,
  PhotoScoreKey,
  ShootAdvice,
} from "./photo-studio-types.js";

function brandOr(brand: BrandMemory | null, key: keyof BrandMemory, fallback: string) {
  const v = brand?.[key]?.trim();
  return v || fallback;
}

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function hashInt(seed: string, min: number, max: number): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return min + (Math.abs(h >>> 0) % (max - min + 1));
}

/** Infer brand visual preset from memory (extensible keywords). */
export function resolveBrandPhotoPreset(brand: BrandMemory | null): BrandPhotoPreset {
  const blob = [
    brand?.brandName,
    brand?.industry,
    brand?.worldview,
    brand?.colors,
    brand?.concept,
    brand?.postTone,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/coffee|カフェ|珈琲|lyric|korean|韓国|木目|暖色/.test(blob)) {
    return {
      key: "warm-cafe",
      name: brand?.brandName?.trim() || "Warm Cafe",
      tags: ["暖色", "韓国カフェ風", "自然光", "木目強調", "商品を際立たせる"],
      description: "暖色と自然光でドリンク・食材を際立たせるカフェ向けプリセット",
      cssFilter:
        "brightness(1.06) contrast(1.08) saturate(1.12) sepia(0.12) hue-rotate(-6deg)",
    };
  }
  if (/street|fade|film|vintage|classic|ストリート|フィルム|ヴィンテージ|無機質/.test(blob)) {
    return {
      key: "new-classic",
      name: brand?.brandName?.trim() || "NEW CLASSIC",
      tags: ["フェード加工", "フィルム調", "ストリートカラー", "無機質", "ヴィンテージ"],
      description: "フィルム調フェードでストリート感を出すファッション向けプリセット",
      cssFilter:
        "brightness(1.02) contrast(0.95) saturate(0.82) sepia(0.18) contrast(1.05)",
    };
  }
  if (/パン|bakery|和菓子|sweet|dessert|菓子/.test(blob)) {
    return {
      key: "bakery-soft",
      name: brand?.brandName?.trim() || "Bakery Soft",
      tags: ["柔らかい光", "暖色", "食感強調", "余白", "やさしい色"],
      description: "焼き色と食感が伝わるやわらかいフード向けプリセット",
      cssFilter: "brightness(1.08) contrast(1.05) saturate(1.1) sepia(0.08)",
    };
  }

  const colors = brandOr(brand, "colors", "");
  const warm = /赤|橙|黄|茶|クリーム|暖/.test(colors);
  return {
    key: "brand-auto",
    name: brand?.brandName?.trim() || "Brand Auto",
    tags: [
      warm ? "暖色寄り" : "ニュートラル",
      brandOr(brand, "worldview", "世界観重視").slice(0, 12),
      "ブランド一致",
      "SNS映え",
      "商品フォーカス",
    ],
    description: `「${brandOr(brand, "worldview", "ブランド世界観")}」とカラー「${colors || "ニュートラル"}」に合わせた自動プリセット`,
    cssFilter: warm
      ? "brightness(1.05) contrast(1.06) saturate(1.08) sepia(0.1)"
      : "brightness(1.04) contrast(1.07) saturate(1.02)",
  };
}

export function analyzePhotoHeuristic(input: {
  brand: BrandMemory | null;
  width?: number | null;
  height?: number | null;
  seed?: string;
}): PhotoAnalysis {
  const seed = input.seed || `${input.brand?.brandName || "x"}:${input.width}x${input.height}`;
  const aspect =
    input.width && input.height ? input.width / input.height : 1;
  const portraitBonus = aspect < 0.85 ? 6 : aspect > 1.2 ? 2 : 8;
  const brandFilled = input.brand
    ? [
        input.brand.concept,
        input.brand.worldview,
        input.brand.colors,
        input.brand.products,
      ].filter((x) => x?.trim()).length
    : 0;

  const scores: Record<PhotoScoreKey, number> = {
    brightness: clamp(68 + hashInt(seed + ":b", -8, 14)),
    composition: clamp(62 + portraitBonus + hashInt(seed + ":c", -6, 12)),
    color: clamp(65 + hashInt(seed + ":col", -10, 16)),
    brandFit: clamp(55 + brandFilled * 8 + hashInt(seed + ":bf", -4, 8)),
    productVisibility: clamp(60 + hashInt(seed + ":p", -8, 18)),
    background: clamp(58 + hashInt(seed + ":bg", -10, 16)),
    whitespace: clamp(64 + hashInt(seed + ":w", -12, 14)),
    snsAppeal: clamp(66 + portraitBonus + hashInt(seed + ":s", -6, 14)),
  };
  const overall = clamp(
    Object.values(scores).reduce((a, b) => a + b, 0) / Object.keys(scores).length,
  );

  const name = brandOr(input.brand, "brandName", "ブランド");
  const concept = brandOr(input.brand, "concept", "コンセプト");
  const improvements: string[] = [];
  if (scores.brightness < 70) improvements.push("全体の明るさを少し上げると商品が手前に出ます");
  if (scores.composition < 72) improvements.push("被写体を中央より少し右（または左）にずらすとリズムが出ます");
  if (scores.brandFit < 75) {
    improvements.push(`世界観「${brandOr(input.brand, "worldview", "ブランド")}」に寄せた色味へ寄せると一致率が上がります`);
  }
  if (scores.background < 70) improvements.push("背景の情報量を減らし、余白を作るとSNS映えが上がります");
  if (scores.productVisibility < 72) {
    improvements.push(`「${brandOr(input.brand, "products", "商品")}」が画面の主役になるようシャープとコントラストを上げる`);
  }
  if (!improvements.length) {
    improvements.push("完成度は高いです。ブランドプリセットで最後の一押しをしましょう");
  }

  return {
    overall,
    scores,
    summary: `画像評価 ${overall}/100。「${name}」の「${concept}」との一致を軸に見ると、${
      overall >= 80 ? "投稿可能な水準" : "ワンクリック改善で伸びしろが大きい"
    }です。`,
    improvements,
  };
}

export function buildEnhanceRecipe(input: {
  brand: BrandMemory | null;
  analysis: PhotoAnalysis;
  preset: BrandPhotoPreset;
}): PhotoEnhanceRecipe {
  const ops: PhotoEnhanceOp[] = [
    "brightness",
    "contrast",
    "colorCorrect",
    "sharpen",
    "productFocus",
  ];
  if (input.analysis.scores.background < 72) ops.push("backgroundCleanup");
  if (input.analysis.scores.brightness < 68) ops.push("shadowFix");
  if (input.analysis.scores.color < 70) ops.push("denoise");

  const labels = [
    "明るさ調整",
    "コントラスト調整",
    "色味補正",
    "シャープ化",
    "商品を目立たせる",
    ...(ops.includes("backgroundCleanup") ? ["背景整理"] : []),
    ...(ops.includes("shadowFix") ? ["影補正"] : []),
    ...(ops.includes("denoise") ? ["ノイズ除去"] : []),
  ];

  // Blend preset + analysis-driven tweaks (still CSS until real provider)
  let extra = "";
  if (input.analysis.scores.brightness < 70) extra += " brightness(1.08)";
  if (input.analysis.scores.composition < 70) extra += " contrast(1.06)";
  if (input.analysis.scores.productVisibility < 70) extra += " saturate(1.08)";

  return {
    mode: "css-filter",
    cssFilter: `${input.preset.cssFilter}${extra}`.trim(),
    opsApplied: ops,
    labels,
    enhancedDataUrl: null,
    provider: "heuristic-css",
  };
}

export function buildShootAdvice(brand: BrandMemory | null, analysis: PhotoAnalysis): ShootAdvice[] {
  const products = brandOr(brand, "products", "商品");
  const advice: ShootAdvice[] = [
    {
      title: "カメラを少し下げる",
      detail: "視線が商品に入りやすくなり、臨場感が出ます",
    },
    {
      title: "背景をシンプルにする",
      detail: `「${products}」以外の要素を減らすと保存されやすい構図になります`,
    },
    {
      title: "自然光で撮影する",
      detail: "窓側の柔らかい光が肌・食感・質感をきれいに出します",
    },
    {
      title: "商品を中央より少し右へ配置する",
      detail: "余白にキャプションやテキストを載せやすい構図になります",
    },
  ];
  if (analysis.scores.whitespace < 65) {
    advice.unshift({
      title: "もう一歩引いて撮る",
      detail: "余白スコアが低めです。余白があるとストーリー加工もしやすいです",
    });
  }
  return advice.slice(0, 4);
}

function bestTime(purpose: string, seed: string): string {
  if (purpose === "sales") return ["11:30", "12:00", "18:00"][hashInt(seed, 0, 2)]!;
  if (purpose === "followers") return ["19:30", "21:00", "7:30"][hashInt(seed, 0, 2)]!;
  return ["12:30", "20:00", "8:00"][hashInt(seed, 0, 2)]!;
}

export function buildPhotoPostVariants(input: {
  brand: BrandMemory | null;
  platform: OsPlatform;
  analysis: PhotoAnalysis;
  preset: BrandPhotoPreset;
}): PhotoPostVariant[] {
  const name = brandOr(input.brand, "brandName", "ブランド");
  const concept = brandOr(input.brand, "concept", "コンセプト");
  const audience = brandOr(input.brand, "targetAudience", "あなた");
  const products = brandOr(input.brand, "products", "商品");
  const tone = brandOr(input.brand, "postTone", "丁寧");
  const goals = brandOr(input.brand, "goals", "成長");
  const seed = `${name}:${input.platform}:${input.analysis.overall}`;

  const baseTags = [
    `#${name.replace(/\s+/g, "")}`,
    `#${input.platform}`,
    `#${concept.replace(/\s+/g, "").slice(0, 12) || "ブランド"}`,
  ];

  return [
    {
      purpose: "save",
      purposeLabel: "① 保存率重視",
      platform: input.platform,
      caption: [
        `${audience}へ。保存推奨です。`,
        ``,
        `今日の写真から分かる「${concept}」のポイント:`,
        `1. ${products}の見どころ`,
        `2. ${tone}な使い方のコツ`,
        `3. 明日すぐ試せる一歩`,
        ``,
        `${name}より — 画像評価 ${input.analysis.overall}/100`,
      ].join("\n"),
      hashtags: [...baseTags, "#保存必須", "#チェックリスト", "#今日の学び"],
      bestTime: bestTime("save", seed),
      reelScript: [
        `0-3秒: 「${audience}、これ保存して」`,
        `3-12秒: 写真の改善前後をチラ見せ`,
        `12-25秒: ${concept}の具体ポイント3つ`,
        `25-35秒: CTA「保存してあとで実践」`,
      ].join("\n"),
      storyIdea: `質問スタンプ「どれが一番気になる？」＋改善前/後の2枚`,
      enhanceHint: "コントラストやや強め・余白を活かすクロップ",
    },
    {
      purpose: "followers",
      purposeLabel: "② フォロワー獲得重視",
      platform: input.platform,
      caption: [
        `${audience}なら、きっと刺さる一枚。`,
        ``,
        `${name}は「${concept}」で、毎日の選択を少し軽くします。`,
        `プロフィールに世界観をまとめています。フォローして続きをどうぞ。`,
      ].join("\n"),
      hashtags: [...baseTags, "#フォロー歓迎", "#新規さんいらっしゃい", "#世界観"],
      bestTime: bestTime("followers", seed + ":f"),
      reelScript: [
        `0-3秒: フック「${audience}あるある」`,
        `3-15秒: 写真→ブランド世界観へ接続`,
        `15-28秒: ${products}のビフォーアフター感`,
        `28-35秒: CTA「フォローで毎日のヒント」`,
      ].join("\n"),
      storyIdea: `アンケート「フォローしたきっかけは？」＋プロフィール誘導`,
      enhanceHint: "彩度を少し上げ、人物/商品を中央寄りに",
    },
    {
      purpose: "sales",
      purposeLabel: "③ 売上重視",
      platform: input.platform,
      caption: [
        `今日の一枚から、${products}へ。`,
        ``,
        `目標は「${goals}」。`,
        `${tone}にお伝えすると — 今買う理由は「${concept}」が日常に入るから。`,
        `詳細はプロフィールのリンクから。`,
      ].join("\n"),
      hashtags: [...baseTags, "#購入前に見て", "#おすすめ", "#本日の一品"],
      bestTime: bestTime("sales", seed + ":s"),
      reelScript: [
        `0-3秒: 商品クローズアップ`,
        `3-12秒: 使う瞬間 / 食べる瞬間`,
        `12-25秒: ベネフィット（${concept}）`,
        `25-35秒: CTA「プロフィールから予約/購入」`,
      ].join("\n"),
      storyIdea: `「今だけ」枠＋リンクスタンプ（導線は1つ）`,
      enhanceHint: "商品を最も明るく、背景は落とす",
    },
  ];
}

export function buildPhotoPredictions(input: {
  analysis: PhotoAnalysis;
  enhanced: boolean;
}): PhotoPredictions {
  const base = input.analysis.overall;
  const boost = input.enhanced ? 8 : 0;
  return {
    saveRatePct: {
      min: clamp(base * 0.08 + boost * 0.2, 2, 18),
      max: clamp(base * 0.14 + boost * 0.35, 5, 28),
    },
    engagementPct: {
      min: clamp(base * 0.05 + boost * 0.15, 1, 12),
      max: clamp(base * 0.1 + boost * 0.25, 3, 20),
    },
    followersDelta: {
      min: clamp(4 + boost + Math.floor(base / 20), 3, 25),
      max: clamp(14 + boost * 2 + Math.floor(base / 10), 10, 45),
    },
    note: "ブランド一致・画像評価・改善有無に基づくAI社員の予想（API未連携時）",
  };
}
