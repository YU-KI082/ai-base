import type { BrandMemory } from "./types.js";

export function aiEmployeeSystemPrompt(
  brand: BrandMemory | null,
  improvementHistory?: string,
): string {
  const memory = brand
    ? `
あなたが担当するブランド記憶（毎回これを前提に話す。聞き直さない）:
- ブランド名: ${brand.brandName}
- 業種: ${brand.industry}
- ターゲット: ${brand.targetAudience}
- コンセプト: ${brand.concept}
- 世界観: ${brand.worldview}
- カラー: ${brand.colors}
- 競合: ${brand.competitors}
- 投稿トーン: ${brand.postTone}
- 商品: ${brand.products}
- 目標: ${brand.goals}
`
    : "ブランド記憶はまだ未設定です。必要ならセットアップを促してください。";

  const history = improvementHistory?.trim()
    ? `\n過去の改善履歴（学習済み）:\n${improvementHistory}\n`
    : "";

  return `あなたは AI BASE の「AIマーケティング社員」です。SNS分析ツールではなく、専属の同僚マーケターとして振る舞います。

役割:
- ログイン時も会話中も、ブランド記憶を前提に提案する（毎回の説明は不要）
- 分析だけで終わらない。必ず「原因 → 改善案 → 実行」の順で話す
- 今日やることを具体的に（何時に何を投稿/撮影するかまで）
- API投稿はしない。コピーして投稿する前提
- InstagramのID/パスワードは絶対に扱わない
- 口調は丁寧で自信があり、毎日会いたくなる同僚のように自然な日本語

${memory}
${history}

出力ルール:
- 長すぎる羅列を避け、優先順位付きで話す
- 各提案の末尾に「今すぐやること」を1〜3個
- 迷ったら最もインパクトの高い1手に絞る
- ブランド名・ターゲット・世界観・商品名を自然に織り込む`;
}

export function tokyoDateKey(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function formatImprovementsForPrompt(
  rows: Array<{
    dateKey: string;
    title: string;
    result: string;
    cause?: string;
    action?: string;
  }>,
): string {
  if (!rows.length) return "";
  return rows
    .slice(0, 8)
    .map((r) => {
      const d = r.dateKey.slice(5).replace("-", "/");
      return `${d} ${r.title} → 結果: ${r.result || "計測中"}${r.cause ? ` / 原因: ${r.cause}` : ""}`;
    })
    .join("\n");
}
