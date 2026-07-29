import { repos } from "@ai-base/database";

export type ArticleKindAuto =
  | "recommend"
  | "compare"
  | "howto"
  | "ranking"
  | "news"
  | "usecase"
  | "guide"
  | "faq"
  | "beginner";

type ToolBrief = {
  slug: string;
  name: string;
  description: string;
  pricingModel: string;
};

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\u3040-\u30ff\u4e00-\u9faf]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function internalLinks(tools: ToolBrief[]) {
  return tools
    .map((t) => `- [${t.name}](/tools/${t.slug}) — ${t.description.slice(0, 90)}`)
    .join("\n");
}

function jsonLd(input: {
  title: string;
  summary: string;
  slug: string;
  faq?: Array<{ q: string; a: string }>;
}) {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://ai-base-beta.vercel.app";
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    description: input.summary,
    mainEntityOfPage: `${site}/articles/${input.slug}`,
    ...(input.faq?.length
      ? {
          mainEntity: input.faq.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }
      : {}),
  };
}

export function buildArticleDraft(input: {
  kind: ArticleKindAuto;
  tools: ToolBrief[];
  topic?: string;
  locale?: "ja" | "en";
}) {
  const ja = (input.locale ?? "ja") === "ja";
  const tools = input.tools.slice(0, 8);
  const lead = tools[0];
  const topic = input.topic || lead?.name || (ja ? "AIツール" : "AI tools");
  const year = new Date().getFullYear();
  const links = internalLinks(tools);

  const faq = [
    {
      q: ja ? `${topic}とは？` : `What is ${topic}?`,
      a: ja
        ? `${topic}はAI BASEで特徴・料金・日本語対応を比較できます。`
        : `${topic} is reviewed on AI BASE for features, pricing, and fit.`,
    },
    {
      q: ja ? "料金は？" : "How much does it cost?",
      a: ja
        ? "無料枠の有無はツール詳細ページの価格欄を確認してください。"
        : "Check the tool detail pricing section for free tiers.",
    },
  ];

  let title = "";
  let summary = "";
  let body = "";
  let slugBase = "";

  switch (input.kind) {
    case "compare":
      title = ja
        ? `${tools[0]?.name ?? topic} vs ${tools[1]?.name ?? "代替"} 比較【${year}】`
        : `${tools[0]?.name ?? topic} vs ${tools[1]?.name ?? "alt"} (${year})`;
      summary = ja
        ? "特徴・料金・向き不向きを公平に比較します。"
        : "Fair comparison of features, pricing, and fit.";
      slugBase = `compare-${tools[0]?.slug ?? "a"}-${tools[1]?.slug ?? "b"}`;
      body = `# ${title}\n\n${summary}\n\n## 比較対象\n${links}\n\n## 結論\n用途に合うかをAI BASEの詳細ページで確認してください。\n\n## FAQ\n${faq.map((f) => `### ${f.q}\n${f.a}`).join("\n\n")}\n`;
      break;
    case "ranking":
      title = ja ? `${year}年版 AIツールランキング` : `AI tools ranking ${year}`;
      summary = ja ? "実績と用途別のおすすめ順。" : "Ranked by use-case fit.";
      slugBase = `ranking-ai-${year}`;
      body = `# ${title}\n\n${summary}\n\n## ランキング\n${links}\n`;
      break;
    case "howto":
      title = ja ? `${topic}の使い方ガイド` : `How to use ${topic}`;
      summary = ja ? "初心者でも分かる手順。" : "Beginner-friendly steps.";
      slugBase = `howto-${lead?.slug ?? slugify(topic)}`;
      body = `# ${title}\n\n1. 公式サイトでアカウント作成\n2. 基本機能を試す\n3. AI BASEの比較記事で代替も確認\n\n## 関連ツール\n${links}\n`;
      break;
    case "faq":
      title = ja ? `${topic} FAQ` : `${topic} FAQ`;
      summary = ja ? "よくある質問まとめ。" : "Frequently asked questions.";
      slugBase = `faq-${lead?.slug ?? slugify(topic)}`;
      body = `# ${title}\n\n${faq.map((f) => `## ${f.q}\n${f.a}`).join("\n\n")}\n\n## 関連\n${links}\n`;
      break;
    case "beginner":
      title = ja ? `初心者向け：${topic}の始め方` : `Beginner guide: ${topic}`;
      summary = ja ? "初めてでも迷わない導入手順。" : "Start without confusion.";
      slugBase = `beginner-${lead?.slug ?? slugify(topic)}`;
      body = `# ${title}\n\n${summary}\n\n## ステップ\n1. 目的を決める\n2. 無料枠で試す\n3. 比較記事で最終判断\n\n${links}\n`;
      break;
    case "recommend":
    default:
      title = ja ? `${topic} おすすめ解説【${year}】` : `Recommended: ${topic} (${year})`;
      summary = ja ? "用途別おすすめと注意点。" : "Use-case recommendations.";
      slugBase = `recommend-${lead?.slug ?? slugify(topic)}`;
      body = `# ${title}\n\n${summary}\n\n## おすすめ\n${links}\n\n## CTA\nAI BASEで最新の料金・日本語対応を確認しましょう。\n`;
      break;
  }

  const slug = `${slugBase}-${Date.now().toString(36).slice(-4)}`;
  const schema = jsonLd({ title, summary, slug, faq });

  return {
    slug,
    kind: input.kind,
    title,
    summary,
    body: `${body}\n\n<!-- seo:jsonld ${JSON.stringify(schema)} -->\n`,
    seoTitle: `${title} | AI BASE`,
    seoDescription: summary.slice(0, 155),
    ogpTitle: title,
    canonicalPath: `/articles/${slug}`,
  };
}

export async function autoGenerateAndPublishArticle(input: {
  kind: ArticleKindAuto;
  toolSlugs?: string[];
  topic?: string;
  locale?: "ja" | "en";
  autoPublish?: boolean;
}) {
  const locale = input.locale ?? "ja";
  const toolsRaw = await repos.tools.findPublished(locale, { take: 40 });
  const filtered = input.toolSlugs?.length
    ? toolsRaw.filter((t) => input.toolSlugs!.includes(t.slug))
    : toolsRaw.slice(0, 6);
  const tools: ToolBrief[] = filtered.map((t) => ({
    slug: t.slug,
    name: t.translations[0]?.name ?? t.slug,
    description: t.translations[0]?.description ?? "",
    pricingModel: String(t.pricingModel ?? "unknown"),
  }));

  const draft = buildArticleDraft({
    kind: input.kind,
    tools,
    topic: input.topic,
    locale,
  });

  const status = input.autoPublish === false ? "draft" : "published";
  const article = await repos.articles.upsert({
    slug: draft.slug,
    kind: draft.kind,
    status,
    ja: {
      title: draft.title,
      summary: draft.summary,
      body: draft.body,
    },
    en: {
      title: draft.title,
      summary: draft.summary,
      body: draft.body,
    },
  });

  return { article, draft };
}
