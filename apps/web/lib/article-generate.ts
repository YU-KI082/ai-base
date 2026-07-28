import type { Locale } from "@ai-base/i18n";

export type ArticleKind =
  | "recommend"
  | "compare"
  | "howto"
  | "ranking"
  | "news"
  | "usecase"
  | "guide";

export type ToolBrief = {
  slug: string;
  name: string;
  description: string;
  pricingModel: string;
  categoryKey?: string;
};

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\u3040-\u30ff\u4e00-\u9faf]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function toolLinks(tools: ToolBrief[], locale: Locale) {
  return tools
    .map((t) => {
      const href = locale === "en" ? `/tools/${t.slug}?locale=en` : `/tools/${t.slug}`;
      return `- [${t.name}](${href}) — ${t.description.slice(0, 100)}（${t.pricingModel}）`;
    })
    .join("\n");
}

export function generateArticleContent(input: {
  kind: ArticleKind;
  tools: ToolBrief[];
  topic?: string;
  locale: Locale;
}): {
  slug: string;
  title: string;
  summary: string;
  body: string;
} {
  const tools = input.tools.slice(0, 12);
  const lead = tools[0];
  const topic =
    input.topic?.trim() ||
    (lead ? lead.name : input.locale === "ja" ? "AIツール" : "AI tools");
  const ja = input.locale === "ja";
  const links = toolLinks(tools, input.locale);
  const year = new Date().getFullYear();

  const kindLabel: Record<ArticleKind, { ja: string; en: string }> = {
    recommend: { ja: "おすすめ", en: "Best" },
    compare: { ja: "比較", en: "Comparison" },
    howto: { ja: "使い方", en: "How to use" },
    ranking: { ja: "ランキング", en: "Ranking" },
    news: { ja: "最新ニュース", en: "Latest news" },
    usecase: { ja: "活用方法", en: "Use cases" },
    guide: { ja: "ガイド", en: "Guide" },
  };

  const label = ja ? kindLabel[input.kind].ja : kindLabel[input.kind].en;

  let title: string;
  let summary: string;
  let body: string;
  let slugBase: string;

  switch (input.kind) {
    case "compare": {
      const a = tools[0]?.name ?? topic;
      const b = tools[1]?.name ?? (ja ? "代替ツール" : "alternatives");
      title = ja
        ? `${a} vs ${b} 徹底比較【${year}】特徴・料金・向き不向き`
        : `${a} vs ${b}: features, pricing & who should choose (${year})`;
      summary = ja
        ? `${a}と${b}の違いを料金・機能・用途で比較。導入前に押さえるポイントを整理します。`
        : `Compare ${a} and ${b} on pricing, features, and fit before you buy.`;
      body = ja
        ? `# ${title}

## この記事でわかること
- ${a}と${b}の違い
- 料金・機能・向き不向き
- どちらを選ぶべきか

## 比較対象
${links}

## 結論（先に）
用途が広い汎用作業なら ${a}、特化用途が明確なら ${b} を優先検討してください。詳細は各ツールページの特徴・メリット・デメリットも参照してください。

## 選び方のポイント
1. 料金モデル（Free / Freemium / Paid）
2. 日本語対応とチーム利用
3. API・自動化の有無
4. 類似ツールとの差分

## 関連リンク
- [AIツール一覧](/tools)
- [カテゴリー](/categories)
`
        : `# ${title}

## What you'll learn
- Key differences between ${a} and ${b}
- Pricing, features, and best-fit users

## Tools covered
${links}

## Bottom line
Pick ${a} for broad general work; pick ${b} when the specialized workflow is clear.

## Related
- [All AI tools](/tools?locale=en)
- [Categories](/categories?locale=en)
`;
      slugBase = `${tools[0]?.slug ?? "tool"}-vs-${tools[1]?.slug ?? "alt"}`;
      break;
    }
    case "ranking": {
      title = ja
        ? `${topic}おすすめAIツールランキング${year}【厳選${tools.length}選】`
        : `Best ${topic} AI tools ranking ${year} (Top ${tools.length})`;
      summary = ja
        ? `${year}年版。${topic}向けに使えるAIツールをランキング形式で紹介。料金・日本語対応も確認できます。`
        : `${year} ranking of AI tools for ${topic}, with pricing and language notes.`;
      body = ja
        ? `# ${title}

## ランキング基準
機能の明確さ、料金のわかりやすさ、日本語対応、実務での使いやすさを重視しています。

## Top ${tools.length}
${links}

## 選び方
無料で試すなら Freemium、チーム導入なら権限とAPIの有無を確認してください。

## 関連
- [AIツール一覧](/tools)
`
        : `# ${title}

## Ranking criteria
Clarity, pricing transparency, language support, and day-to-day usefulness.

## Top ${tools.length}
${links}

## Related
- [Browse tools](/tools?locale=en)
`;
      slugBase = `ranking-${slugify(topic)}-${year}`;
      break;
    }
    case "howto": {
      const name = lead?.name ?? topic;
      title = ja
        ? `${name}の使い方｜始め方・活用例・注意点【${year}】`
        : `How to use ${name}: setup, tips & pitfalls (${year})`;
      summary = ja
        ? `${name}の始め方から実務での使い方まで。メリット・デメリットと料金の見方も解説。`
        : `Get started with ${name}: setup, practical tips, pricing, and pitfalls.`;
      body = ja
        ? `# ${title}

## 概要
${lead?.description ?? `${name}の基本的な使い方を解説します。`}

## 始め方
1. 公式サイトでアカウント作成
2. 無料枠があれば制限を確認
3. 小さなタスクで試す
4. チーム展開前に料金プランを確認

## 活用例
${links}

## 注意点
個人情報や機密情報の入力、生成物の著作権・事実確認に注意してください。

## 関連
- [${name}詳細](/tools/${lead?.slug ?? ""})
- [比較する](/compare)
`
        : `# ${title}

## Overview
${lead?.description ?? `Practical guide to ${name}.`}

## Steps
1. Create an account
2. Check free limits
3. Start with a small task
4. Review pricing before team rollout

## Related tools
${links}
`;
      slugBase = `howto-${lead?.slug ?? slugify(topic)}`;
      break;
    }
    case "news": {
      title = ja
        ? `最新AIニュースまとめ｜${topic}関連の注目アップデート（${year}）`
        : `AI news roundup: ${topic} updates (${year})`;
      summary = ja
        ? `${topic}周辺の最新AI動向と、関連ツールのチェックポイントをまとめました。`
        : `Latest AI updates around ${topic} and tools worth watching.`;
      body = ja
        ? `# ${title}

## 注目ポイント
- モデル性能と料金の変化
- 日本語対応の改善
- 業務導入しやすいツール

## チェックしたいツール
${links}

## 次にやること
気になるツールは詳細ページで特徴・料金・FAQを確認し、比較ページで候補を絞りましょう。

- [AIツール一覧](/tools)
`
        : `# ${title}

## Watchlist
${links}

## Next steps
Open each tool page for pricing, FAQ, and similar alternatives.
`;
      slugBase = `news-${slugify(topic)}-${year}`;
      break;
    }
    case "usecase": {
      title = ja
        ? `${topic}でのAI活用方法｜現場で使えるプロンプトとツール`
        : `AI use cases for ${topic}: workflows and tools`;
      summary = ja
        ? `${topic}業務にAIを入れる手順と、相性の良いツールを紹介します。`
        : `Practical AI workflows for ${topic} and matching tools.`;
      body = ja
        ? `# ${title}

## 活用の流れ
1. 定型作業を洗い出す
2. 無料枠で小さく試す
3. 品質チェックのルールを決める
4. チームへ展開

## おすすめツール
${links}

## 関連
- [カテゴリー一覧](/categories)
`
        : `# ${title}

## Workflow
1. List repetitive tasks
2. Trial free tiers
3. Define quality checks
4. Roll out to the team

## Recommended tools
${links}
`;
      slugBase = `usecase-${slugify(topic)}`;
      break;
    }
    case "recommend":
    default: {
      title = ja
        ? `${topic}におすすめのAIツール${tools.length}選【${year}年版】`
        : `${tools.length} best AI tools for ${topic} (${year})`;
      summary = ja
        ? `${topic}向けのおすすめAIツールを厳選。料金（Free / Freemium / Paid）と用途別に紹介します。`
        : `Curated AI tools for ${topic}, with Free / Freemium / Paid notes.`;
      body = ja
        ? `# ${title}

## はじめに
${topic}で使えるAIツールを、用途と料金の観点でまとめました。詳細は各ツールページの概要・特徴・FAQもご覧ください。

## おすすめ一覧
${links}

## 選び方のチェックリスト
- 日本語対応はあるか
- 無料プランで試せるか
- API / 自動化は必要か
- 類似ツールとの差分

## 関連記事・ページ
- [AIツール一覧](/tools)
- [比較](/compare)
- [記事一覧](/articles)
`
        : `# ${title}

## Intro
A practical shortlist for ${topic}.

## Recommendations
${links}

## Related
- [Tools](/tools?locale=en)
- [Compare](/compare?locale=en)
- [Articles](/articles?locale=en)
`;
      slugBase = `best-${slugify(topic)}-${year}`;
      break;
    }
  }

  return {
    slug: slugify(slugBase) || `article-${Date.now()}`,
    title,
    summary,
    body,
  };
}

export const ARTICLE_KINDS: ArticleKind[] = [
  "recommend",
  "compare",
  "howto",
  "ranking",
  "news",
  "usecase",
];
