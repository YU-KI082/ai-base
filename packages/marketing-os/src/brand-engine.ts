import type { BrandMemory, NextAction, OsPlatform } from "./types.js";
import { OS_PLATFORMS } from "./types.js";
import type { ActionableInsight } from "./types.js";

export type HandleRow = { platform: string; username: string };

function brandOr(brand: BrandMemory | null, key: keyof BrandMemory, fallback: string) {
  const v = brand?.[key]?.trim();
  return v || fallback;
}

/** Completeness 0–100 from filled brand fields + handles. */
export function brandCompleteness(
  brand: BrandMemory | null,
  handles: HandleRow[],
): number {
  if (!brand) return 15;
  const fields: (keyof BrandMemory)[] = [
    "brandName",
    "industry",
    "targetAudience",
    "concept",
    "worldview",
    "colors",
    "competitors",
    "postTone",
    "products",
    "goals",
  ];
  const filled = fields.filter((k) => brand[k]?.trim()).length;
  const handleScore = Math.min(40, handles.filter((h) => h.username.trim()).length * 8);
  return Math.min(100, Math.round((filled / fields.length) * 60 + handleScore));
}

export function buildBrandAnalysis(
  brand: BrandMemory | null,
  handles: HandleRow[],
): ActionableInsight {
  const name = brandOr(brand, "brandName", "ブランド");
  const concept = brandOr(brand, "concept", "コンセプト未設定");
  const audience = brandOr(brand, "targetAudience", "ターゲット未設定");
  const tone = brandOr(brand, "postTone", "トーン未設定");
  const competitors = brandOr(brand, "competitors", "競合未設定");
  const goals = brandOr(brand, "goals", "目標未設定");
  const worldview = brandOr(brand, "worldview", "世界観未設定");
  const listed = handles.filter((h) => h.username.trim());
  const missing = OS_PLATFORMS.filter(
    (p) => !listed.some((h) => h.platform === p),
  );

  const findings = [
    `「${name}」のコンセプト「${concept}」がプロフィール1行目で伝わるかが最優先です（ターゲット: ${audience}）。`,
    `投稿トーン「${tone}」と世界観「${worldview}」の一貫性が、保存・フォローの決め手になります。`,
    listed.length
      ? `登録済み: ${listed.map((h) => `${h.platform}@${h.username}`).join(" / ")}。各媒体で同じ第一印象を揃えてください。`
      : "SNSユーザー名が未登録です。現状把握のため各媒体の@を追加してください。",
    missing.length
      ? `未登録媒体（${missing.join(", ")}）は機会損失です。優先度の高い媒体から登録を。`
      : "主要5媒体のユーザー名は揃っています。",
    `目標「${goals}」に対し、競合「${competitors}」との差分（世界観・専門性・CTA）を毎週1つ検証してください。`,
  ];

  const nextActions: NextAction[] = [
    {
      title: `プロフィール文を「${audience}」向けに1行で書き直す`,
      why: `「${name}」の初見3秒で「誰の・何の」が伝わるとフォロー率が上がります`,
      effort: "low",
      deepLink: "/admin/brand",
    },
    {
      title: `「${concept}」をフックにした投稿を1本生成してコピー投稿`,
      why: "分析より実行。ブランド記憶を使った仮説検証を今日回します",
      effort: "mid",
      deepLink: "/admin/create",
    },
    {
      title: `競合「${competitors}」の保存されやすい投稿を3本メモする`,
      why: `目標「${goals}」に効く勝ちパターンを自ブランドのトーン「${tone}」へ翻訳するため`,
      effort: "mid",
      deepLink: "/admin/analysis",
    },
  ];

  return {
    summary: `「${name}」向け仮説分析です（公開APIなし）。コンセプト「${concept}」×ターゲット「${audience}」の一貫性と、登録ハンドルの網羅性が次の伸びしろです。`,
    findings,
    nextActions,
  };
}

/** Split analysis into profile / competitor / learning slices (no extra APIs). */
export function buildAnalysisSections(
  brand: BrandMemory | null,
  handles: HandleRow[],
  improvements: Array<{ title: string; result: string; cause: string; dateKey: string }> = [],
): {
  profile: string[];
  competitor: string[];
  learning: string[];
} {
  const name = brandOr(brand, "brandName", "ブランド");
  const audience = brandOr(brand, "targetAudience", "ターゲット未設定");
  const tone = brandOr(brand, "postTone", "トーン未設定");
  const worldview = brandOr(brand, "worldview", "世界観未設定");
  const concept = brandOr(brand, "concept", "コンセプト未設定");
  const competitors = brandOr(brand, "competitors", "競合未設定");
  const goals = brandOr(brand, "goals", "目標未設定");
  const listed = handles.filter((h) => h.username.trim());

  return {
    profile: [
      `プロフィール一文で「${name} × ${concept}」が伝わるか（対象: ${audience}）`,
      `トーン「${tone}」と世界観「${worldview}」の一貫性`,
      listed.length
        ? `登録ハンドル: ${listed.map((h) => `${h.platform}@${h.username}`).join(" / ")}`
        : "SNSユーザー名が未登録です",
    ],
    competitor: [
      `競合「${competitors}」との差分（世界観・専門性・CTA）を週1つ検証`,
      `目標「${goals}」に対し、競合が取っている保存導線を自ブランドのトーンへ翻訳`,
      "競合の保存されやすい投稿を3本メモし、構成だけ借りる",
    ],
    learning: improvements.length
      ? improvements.slice(0, 5).map(
          (i) =>
            `${i.dateKey.slice(5)} ${i.title} → ${i.result || "計測中"}${i.cause ? `（原因: ${i.cause}）` : ""}`,
        )
      : ["改善履歴がまだありません。今日のタスク完了から学習が始まります。"],
  };
}

export function buildBrandScore(
  brand: BrandMemory | null,
  handles: HandleRow[],
): {
  overall: number;
  platforms: Record<string, { score: number; reason: string }>;
  reasons: string[];
  nextActions: NextAction[];
} {
  const name = brandOr(brand, "brandName", "ブランド");
  const concept = brandOr(brand, "concept", "");
  const tone = brandOr(brand, "postTone", "");
  const goals = brandOr(brand, "goals", "");
  const completeness = brandCompleteness(brand, handles);
  const platforms: Record<string, { score: number; reason: string }> = {};

  for (const p of OS_PLATFORMS) {
    const handle = handles.find((h) => h.platform === p && h.username.trim());
    let score = 28;
    const reasons: string[] = [];
    if (handle) {
      score += 28;
      reasons.push(`@${handle.username} 登録済み`);
    } else {
      reasons.push("ユーザー名未登録");
    }
    if (brand?.brandName?.trim()) score += 8;
    if (concept) score += 8;
    if (tone) score += 8;
    if (brand?.targetAudience?.trim()) score += 6;
    if (brand?.products?.trim()) score += 6;
    if (goals) score += 4;
    // slight platform weighting for video-first goals
    if ((p === "tiktok" || p === "instagram" || p === "youtube") && /フォロワー|認知|リール|動画/.test(goals)) {
      score += 4;
      reasons.push("目標と媒体特性が近い");
    }
    score = Math.max(0, Math.min(100, score));
    platforms[p] = {
      score,
      reason: reasons.join("。") + (concept ? `／コンセプト「${concept.slice(0, 24)}」` : ""),
    };
  }

  const overall = Math.round(
    Object.values(platforms).reduce((s, x) => s + x.score, 0) / OS_PLATFORMS.length,
  );

  const weakest = Object.entries(platforms).sort((a, b) => a[1].score - b[1].score)[0];

  return {
    overall,
    platforms,
    reasons: [
      `ブランド記憶の充足度は約 ${completeness}/100。「${name}」の入力がスコアの土台です`,
      weakest
        ? `最も低い媒体は ${weakest[0]}（${weakest[1].score}点）。ここから改善すると総合が伸びやすい`
        : "媒体スコアを均等に底上げする",
      goals ? `目標「${goals}」に直結する投稿実験を優先` : "目標をブランド記憶に追加すると提案精度が上がる",
    ],
    nextActions: [
      {
        title: weakest
          ? `${weakest[0]} のプロフィールを今日整える`
          : "弱い媒体のプロフィールを整える",
        why: "ボトルネック媒体を上げると総合 AI SCORE が伸びやすい",
        effort: "low",
        deepLink: "/admin/brand",
      },
      {
        title: `「${name}」向け投稿を1本生成する`,
        why: "スコア改善は投稿実験で検証する",
        effort: "mid",
        deepLink: "/admin/create",
      },
    ],
  };
}

export function buildBrandTasks(brand: BrandMemory | null): Array<{
  title: string;
  detail: string;
  category: string;
  deepLink?: string;
}> {
  const name = brandOr(brand, "brandName", "ブランド");
  const concept = brandOr(brand, "concept", "世界観");
  const audience = brandOr(brand, "targetAudience", "見込み客");
  const products = brandOr(brand, "products", "商品・サービス");
  const competitors = brandOr(brand, "competitors", "競合");
  const goals = brandOr(brand, "goals", "認知拡大");
  const tone = brandOr(brand, "postTone", "丁寧");

  return [
    {
      title: `今日の投稿: 「${concept}」を${audience}に刺さるフックで1本`,
      detail: `${name}のトーン「${tone}」。生成→コピー投稿`,
      category: "post",
      deepLink: "/admin/create",
    },
    {
      title: `リール企画: ${products}のビフォーアフターを15秒で`,
      detail: "0–3秒で問題提起。おすすめ時間は夜20–22時帯を仮説に",
      category: "reel",
      deepLink: "/admin/create",
    },
    {
      title: `ストーリー案: 今日の制作裏話（${name}）を3枚`,
      detail: "世界観の温度感を見せ、保存より親近感を狙う",
      category: "story",
      deepLink: "/admin#tasks",
    },
    {
      title: `コメント: 「${competitors}」周辺の保存投稿に有益返信を3件`,
      detail: "売り込み禁止。価値提供のみ",
      category: "engage",
      deepLink: "/admin#tasks",
    },
    {
      title: `改善: プロフィールの一文を目標「${goals}」に合わせて更新`,
      detail: "ハイライト or リンクの導線も1つだけ整える",
      category: "improve",
      deepLink: "/admin/analysis",
    },
  ];
}

export function buildBrandCreative(
  brand: BrandMemory | null,
  platform: OsPlatform,
): {
  caption: string;
  hashtags: string[];
  reelScript: string;
  imagePrompt: string;
} {
  const name = brandOr(brand, "brandName", "ブランド");
  const concept = brandOr(brand, "concept", "独自の価値");
  const audience = brandOr(brand, "targetAudience", "あなた");
  const products = brandOr(brand, "products", "サービス");
  const tone = brandOr(brand, "postTone", "誠実でクリア");
  const worldview = brandOr(brand, "worldview", "洗練された余白");
  const colors = brandOr(brand, "colors", "モノトーン");
  const goals = brandOr(brand, "goals", "信頼獲得");

  const caption = [
    `${audience}へ。`,
    ``,
    `${name}が大切にしているのは「${concept}」。`,
    `${products}を通じて、毎日の選択をもう少し軽くしたいと思っています。`,
    ``,
    `トーンは${tone}。今日は小さな一歩だけ。`,
    ``,
    `保存して、あとで試してみてください。`,
    `#${name.replace(/\s+/g, "")}より`,
  ].join("\n");

  const tags = [
    `#${name.replace(/\s+/g, "")}`,
    `#${platform}`,
    "#SNS運用",
    "#ブランドづくり",
    audience.length < 20 ? `#${audience.replace(/\s+/g, "")}` : "#ターゲットマーケ",
  ];

  const reelScript = [
    `【${platform} / ${name}】`,
    `0-3秒: 「${audience}、こんな悩みありませんか？」→ 画面に短いテキスト`,
    `3-10秒: 共感（よくある失敗）。トーンは${tone}`,
    `10-20秒: ${concept}の視点で解決のヒントを1つ`,
    `20-28秒: ${products}の具体例（ビフォー→アフター）`,
    `28-35秒: CTA「プロフィールから詳細へ」／目標: ${goals}`,
  ].join("\n");

  const imagePrompt = `${worldview}、カラーは${colors}、被写体は${products}を連想させるミニマル構図、余白多め、文字少なめ、高級感、${name}ブランドの世界観、9:16`;

  return { caption, hashtags: tags, reelScript, imagePrompt };
}

export function buildBrandBrief(input: {
  brand: BrandMemory | null;
  scoreOverall: number;
  scoreLines: string;
  taskLines: string;
  handles: HandleRow[];
}): string {
  const name = brandOr(input.brand, "brandName", "ブランド");
  const concept = brandOr(input.brand, "concept", "コンセプト");
  const audience = brandOr(input.brand, "targetAudience", "ターゲット");
  const competitors = brandOr(input.brand, "competitors", "競合");
  const goals = brandOr(input.brand, "goals", "成長");
  const tone = brandOr(input.brand, "postTone", "丁寧");
  const products = brandOr(input.brand, "products", "商品");
  const handleLine = input.handles
    .filter((h) => h.username.trim())
    .map((h) => `${h.platform}@${h.username}`)
    .join(" / ");

  return [
    `おはようございます。${name}専属のAI社員です。`,
    ``,
    `今日は目標「${goals}」に向けて、コンセプト「${concept}」を${audience}に伝える一日にしましょう。登録アカウント: ${handleLine || "未登録"}。`,
    ``,
    `■ 総合AI SCORE: ${input.scoreOverall}点`,
    input.scoreLines,
    ``,
    `■ 今日やること（優先順）`,
    input.taskLines,
    ``,
    `■ 改善点`,
    `・プロフィールの一文を「${audience}」向けに合わせる（トーン: ${tone}）`,
    `・投稿のフックを「${concept}」起点にする`,
    `・競合「${competitors}」との差分を週1でメモする`,
    ``,
    `■ 投稿案の方向性`,
    `フック例:「${audience}が${products}でつまずく瞬間、${name}ならこう考える」→ 保存されやすい具体例を1つ。`,
    ``,
    `■ 競合・市場`,
    `「${competitors}」は機能比較で勝ちにいきがちです。${name}は世界観と${tone}な伴走で差別化を。`,
    ``,
    `■ 今すぐの次の一手`,
    `「投稿生成」でキャプションを作り、今すぐコピー投稿してください。分析より実験です。`,
  ].join("\n");
}

export function buildBrandChatReply(
  brand: BrandMemory | null,
  userMessage: string,
  improvements: Array<{ dateKey: string; title: string; result: string }> = [],
): string {
  const name = brandOr(brand, "brandName", "ブランド");
  const concept = brandOr(brand, "concept", "コンセプト");
  const audience = brandOr(brand, "targetAudience", "ターゲット");
  const tone = brandOr(brand, "postTone", "丁寧");
  const products = brandOr(brand, "products", "商品");
  const goals = brandOr(brand, "goals", "成長");
  const competitors = brandOr(brand, "competitors", "競合");
  const worldview = brandOr(brand, "worldview", "世界観");
  const learned = improvements[0]
    ? `（学習済み: ${improvements[0].dateKey.slice(5).replace("-", "/")} ${improvements[0].title} → ${improvements[0].result}）`
    : "";

  const q = userMessage.toLowerCase();
  if (/フォロワー|増や/.test(userMessage)) {
    return [
      `了解です。「${name}」のフォロワー拡大ですね。${learned}`,
      ``,
      `【原因】`,
      `初見で「${audience}のための${concept}」が伝わらず、フォロー決断まで届いていません。`,
      ``,
      `【改善案】`,
      `プロフィール一文と投稿フックを世界観「${worldview}」で揃える。`,
      ``,
      `【実行】`,
      `1. プロフィール1行目を「${audience}向け / ${concept}」に更新`,
      `2. フック「${audience}が後悔すること」→${tone}に解決する投稿を1本（19:30目安）`,
      `3. ${competitors}周辺の保存投稿に有益コメントを3件`,
      ``,
      `今すぐ: 「作成」でキャプションを生成してコピー投稿しましょう。目標は「${goals}」です。`,
    ].join("\n");
  }
  if (/プロフィール|改善/.test(userMessage)) {
    return [
      `プロフィール改善に入ります（${name}）。`,
      ``,
      `【原因】一文が抽象的だと、${audience}が「自分向け」と感じられません。`,
      `【改善案】「誰の・何の・どうなる」を1行に固定。`,
      `【実行】`,
      `・名前欄: ${name}`,
      `・一文: ${audience}のための${concept}`,
      `・導線: ${products}の詳細（リンクは1つ）`,
      ``,
      `今日中に一文だけ更新→投稿1本で検証、が最短です。`,
    ].join("\n");
  }
  if (/リール|reel/i.test(userMessage) || q.includes("reel")) {
    return [
      `リールを一緒に作りましょう（${name}）。`,
      ``,
      `【原因】新規リーチは静止画よりリールが主戦場です。`,
      `【改善案】0–3秒で悩み→${concept}で解決→CTA。`,
      `【実行】`,
      `0-3秒: ${audience}の悩みを一言`,
      `3-15秒: ${concept}の視点でヒント`,
      `15-30秒: ${products}の具体例`,
      `CTA: プロフィールへ`,
      ``,
      `「作成」で台本全文を出します。今すぐ作りましょう。`,
    ].join("\n");
  }
  if (/競合/.test(userMessage)) {
    return [
      `競合「${competitors}」の見立てです。`,
      ``,
      `【原因】機能比較だけで戦うと、${name}の世界観が埋もれます。`,
      `【改善案】保存されやすい型を借り、${tone}な伴走トーンへ翻訳。`,
      `【実行】競合の保存投稿3本メモ→差分を1つ決めて投稿生成。`,
    ].join("\n");
  }
  if (/保存/.test(userMessage)) {
    return [
      `保存率アップの最短ルートです（${name}）。`,
      ``,
      `【原因】「すぐ使える具体」が足りないと保存されません。`,
      `【改善案】チェックリスト / 失敗→対策 / 3ステップ手順。`,
      `【実行】「作成」でチェックリスト投稿を生成→今夜コピー投稿。`,
    ].join("\n");
  }
  return [
    `「${userMessage}」ですね。${name}（${concept} / ${audience}）の文脈で整理します。${learned}`,
    ``,
    `【原因】優先順位が散ると、目標「${goals}」に効く一手が遅れます。`,
    `【改善案】今日はインパクト最大の1手に集中。`,
    `【実行】`,
    `1. 「作成」で投稿を1本生成`,
    `2. プロフィール一文を${tone}に揃える`,
    `3. ホームの今日のミッションを上から実行`,
    ``,
    `何を手伝いましょうか？`,
  ].join("\n");
}
