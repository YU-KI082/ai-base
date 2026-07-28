import { PrismaClient, type PricingModel } from "@prisma/client";
import { LAUNCH_TOOLS, type SeedTool } from "./launch-tools";

const prisma = new PrismaClient();

const categories = [
  { key: "text", sortOrder: 1, en: "Text", ja: "テキスト" },
  { key: "image", sortOrder: 2, en: "Image", ja: "画像" },
  { key: "video", sortOrder: 3, en: "Video", ja: "動画" },
  { key: "audio", sortOrder: 4, en: "Audio", ja: "音声" },
  { key: "coding", sortOrder: 5, en: "Coding", ja: "コーディング" },
  { key: "marketing", sortOrder: 6, en: "Marketing", ja: "マーケティング" },
  { key: "sales", sortOrder: 7, en: "Sales", ja: "セールス" },
  { key: "automation", sortOrder: 8, en: "Automation", ja: "自動化" },
  { key: "productivity", sortOrder: 9, en: "Productivity", ja: "生産性" },
  { key: "design", sortOrder: 10, en: "Design", ja: "デザイン" },
  { key: "education", sortOrder: 11, en: "Education", ja: "教育" },
] as const;

const permissions = [
  "admin.access",
  "drafts.read",
  "drafts.approve",
  "agents.read",
  "agents.manage",
  "workflows.read",
  "tools.read",
  "logs.read",
  "settings.manage",
] as const;

async function upsertTool(demo: SeedTool) {
  const category = await prisma.category.findUnique({
    where: { key: demo.categoryKey },
  });
  const tool = await prisma.aiTool.upsert({
    where: { slug: demo.slug },
    create: {
      slug: demo.slug,
      homepageUrl: demo.homepageUrl,
      pricingModel: demo.pricingModel as PricingModel,
      hasFreePlan: demo.hasFreePlan,
      hasApi: demo.hasApi,
      status: "published",
      publishedAt: new Date(),
      sourceName: "seed",
    },
    update: {
      homepageUrl: demo.homepageUrl,
      pricingModel: demo.pricingModel as PricingModel,
      hasFreePlan: demo.hasFreePlan,
      hasApi: demo.hasApi,
      status: "published",
      publishedAt: new Date(),
    },
  });

  const site =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";

  for (const locale of ["en", "ja"] as const) {
    const t = demo[locale];
    await prisma.aiToolTranslation.upsert({
      where: { toolId_locale: { toolId: tool.id, locale } },
      create: {
        toolId: tool.id,
        locale,
        name: t.name,
        description: t.description,
        features: t.features,
        pros: t.pros,
        cons: t.cons,
        languageSupport: t.languageSupport ?? [],
        tags: t.tags ?? [],
        useCases: t.useCases ?? [],
        recommendedUsers: t.recommendedUsers ?? [],
        pricingNotes: t.pricingNotes ?? null,
        seoTitle: `${t.name} | AI BASE`,
        seoDescription: t.description.slice(0, 155),
        faq: [
          {
            q: locale === "ja" ? `${t.name}とは？` : `What is ${t.name}?`,
            a: t.description,
          },
          {
            q:
              locale === "ja"
                ? `${t.name}の料金は？`
                : `How much does ${t.name} cost?`,
            a: t.pricingNotes ?? (locale === "ja" ? "公式サイトで最新料金を確認してください。" : "Check the official site for current pricing."),
          },
        ],
        schemaJson: {
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: t.name,
          description: t.description,
          applicationCategory: "BusinessApplication",
          url: `${site}/tools/${demo.slug}`,
        },
      },
      update: {
        name: t.name,
        description: t.description,
        features: t.features,
        pros: t.pros,
        cons: t.cons,
        languageSupport: t.languageSupport ?? [],
        tags: t.tags ?? [],
        useCases: t.useCases ?? [],
        recommendedUsers: t.recommendedUsers ?? [],
        pricingNotes: t.pricingNotes ?? null,
        seoTitle: `${t.name} | AI BASE`,
        seoDescription: t.description.slice(0, 155),
      },
    });
  }

  if (category) {
    await prisma.aiToolCategory.upsert({
      where: {
        toolId_categoryId: { toolId: tool.id, categoryId: category.id },
      },
      create: { toolId: tool.id, categoryId: category.id },
      update: {},
    });
  }

  // Monetization: primary tracked link (ASP partner URL when provided)
  const monetizeUrl = demo.affiliateUrl ?? demo.homepageUrl;
  const network = demo.affiliateNetwork ?? (demo.affiliateUrl ? "asp" : "direct");
  const label =
    demo.affiliateLabel ??
    (network === "direct" ? "公式サイト" : "公式・紹介リンク");

  const existingAff = await prisma.affiliateLink.findFirst({
    where: { toolId: tool.id, network },
  });
  if (!existingAff) {
    await prisma.affiliateLink.create({
      data: {
        toolId: tool.id,
        label,
        url: monetizeUrl,
        network,
        priority: 100,
        isHealthy: true,
      },
    });
  } else {
    await prisma.affiliateLink.update({
      where: { id: existingAff.id },
      data: {
        label,
        url: monetizeUrl,
        isHealthy: true,
        priority: 100,
      },
    });
  }

  // Always keep a healthy homepage fallback at lower priority when ASP differs
  if (demo.affiliateUrl && demo.affiliateUrl !== demo.homepageUrl) {
    const direct = await prisma.affiliateLink.findFirst({
      where: { toolId: tool.id, network: "direct" },
    });
    if (!direct) {
      await prisma.affiliateLink.create({
        data: {
          toolId: tool.id,
          label: "公式サイト",
          url: demo.homepageUrl,
          network: "direct",
          priority: 10,
          isHealthy: true,
        },
      });
    }
  }

  return tool.id;
}

async function main() {
  for (const key of permissions) {
    await prisma.permission.upsert({
      where: { key },
      create: { key, description: key },
      update: {},
    });
  }

  const adminRole = await prisma.role.upsert({
    where: { key: "admin" },
    create: {
      key: "admin",
      name: "Administrator",
      description: "Full platform access",
    },
    update: {},
  });

  const allPermissions = await prisma.permission.findMany();
  for (const permission of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      },
      create: { roleId: adminRole.id, permissionId: permission.id },
      update: {},
    });
  }

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@ai-base.local" },
    create: {
      email: "admin@ai-base.local",
      name: "AI BASE Admin",
      locale: "ja",
    },
    update: { locale: "ja" },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: { userId: adminUser.id, roleId: adminRole.id },
    },
    create: { userId: adminUser.id, roleId: adminRole.id },
    update: {},
  });

  for (const category of categories) {
    const row = await prisma.category.upsert({
      where: { key: category.key },
      create: { key: category.key, sortOrder: category.sortOrder },
      update: { sortOrder: category.sortOrder },
    });
    await prisma.categoryTranslation.upsert({
      where: { categoryId_locale: { categoryId: row.id, locale: "en" } },
      create: {
        categoryId: row.id,
        locale: "en",
        name: category.en,
        slug: category.key,
        description: `${category.en} AI tools`,
      },
      update: { name: category.en, slug: category.key },
    });
    await prisma.categoryTranslation.upsert({
      where: { categoryId_locale: { categoryId: row.id, locale: "ja" } },
      create: {
        categoryId: row.id,
        locale: "ja",
        name: category.ja,
        slug: category.key,
        description: `${category.ja}のAIツール`,
      },
      update: { name: category.ja, slug: category.key },
    });
  }

  await prisma.setting.upsert({
    where: { key: "locales" },
    create: { key: "locales", value: ["en", "ja"] },
    update: { value: ["en", "ja"] },
  });

  const toolIds: string[] = [];
  for (const demo of LAUNCH_TOOLS) {
    toolIds.push(await upsertTool(demo));
  }

  if (toolIds.length >= 2) {
    const slug = "chatgpt-vs-notion-ai";
    const chatgpt = await prisma.aiTool.findUnique({ where: { slug: "chatgpt" } });
    const notion = await prisma.aiTool.findUnique({ where: { slug: "notion-ai" } });
    if (chatgpt && notion) {
      const comparison = await prisma.comparison.upsert({
        where: { slug },
        create: { slug, status: "published" },
        update: { status: "published" },
      });
      await prisma.comparisonTranslation.upsert({
        where: {
          comparisonId_locale: { comparisonId: comparison.id, locale: "en" },
        },
        create: {
          comparisonId: comparison.id,
          locale: "en",
          title: "ChatGPT vs Notion AI",
          summary:
            "Choose ChatGPT for broad general assistance; Notion AI when your knowledge already lives in Notion.",
          recommendation:
            "Start with ChatGPT for exploration, add Notion AI if your team wiki is already in Notion.",
        },
        update: {
          title: "ChatGPT vs Notion AI",
          summary:
            "Choose ChatGPT for broad general assistance; Notion AI when your knowledge already lives in Notion.",
        },
      });
      await prisma.comparisonTranslation.upsert({
        where: {
          comparisonId_locale: { comparisonId: comparison.id, locale: "ja" },
        },
        create: {
          comparisonId: comparison.id,
          locale: "ja",
          title: "ChatGPT vs Notion AI",
          summary:
            "汎用支援ならChatGPT、Notion上のナレッジ活用ならNotion AIが向きます。",
          recommendation:
            "まずChatGPTで探索し、社内WikiがNotionならNotion AIを追加検討。",
        },
        update: {
          title: "ChatGPT vs Notion AI",
          summary:
            "汎用支援ならChatGPT、Notion上のナレッジ活用ならNotion AIが向きます。",
        },
      });
      await prisma.comparisonItem.deleteMany({
        where: { comparisonId: comparison.id },
      });
      await prisma.comparisonItem.createMany({
        data: [
          {
            comparisonId: comparison.id,
            toolId: chatgpt.id,
            side: "left",
            sortOrder: 0,
          },
          {
            comparisonId: comparison.id,
            toolId: notion.id,
            side: "right",
            sortOrder: 1,
          },
        ],
      });
    }
  }

  // Seed SEO articles (recommend / compare / ranking / howto / news / usecase)
  const sampleArticles = [
    {
      slug: "best-ai-tools-for-business-2026",
      kind: "recommend",
      ja: {
        title: "ビジネスにおすすめのAIツール厳選【2026年版】",
        summary:
          "業務効率化・マーケ・開発向けに使えるAIツールを厳選。料金（Free / Freemium / Paid）と用途別に紹介します。",
        body: `# ビジネスにおすすめのAIツール厳選【2026年版】

## はじめに
日々の業務にAIを取り入れるなら、用途と料金を先に決めるのが近道です。

## おすすめ一覧
- [ChatGPT](/tools/chatgpt) — 汎用対話・文章・調査
- [Claude](/tools/claude) — 長文分析・コーディング
- [Notion AI](/tools/notion-ai) — ドキュメント内の執筆支援
- [Zapier](/tools/zapier-central) — 業務自動化
- [Cursor](/tools/cursor) — AIコーディング

## 関連
- [AIツール一覧](/tools)
- [記事一覧](/articles)
`,
      },
      en: {
        title: "Best AI tools for business (2026)",
        summary: "Curated AI tools for ops, marketing, and engineering with pricing notes.",
        body: `# Best AI tools for business (2026)

## Picks
- [ChatGPT](/tools/chatgpt?locale=en)
- [Claude](/tools/claude?locale=en)
- [Notion AI](/tools/notion-ai?locale=en)
- [Zapier](/tools/zapier-central?locale=en)
- [Cursor](/tools/cursor?locale=en)
`,
      },
    },
    {
      slug: "chatgpt-vs-claude-comparison",
      kind: "compare",
      ja: {
        title: "ChatGPT vs Claude 徹底比較【特徴・料金・向き不向き】",
        summary: "人気の2大対話AIを料金・用途・長文処理の観点で比較します。",
        body: `# ChatGPT vs Claude 徹底比較

## 結論
汎用とエコシステムなら ChatGPT、長文・分析重視なら Claude が有力です。

## 詳細
- [ChatGPT](/tools/chatgpt)
- [Claude](/tools/claude)
- [比較ページ](/compare?tools=chatgpt,claude)
`,
      },
      en: {
        title: "ChatGPT vs Claude comparison",
        summary: "Compare pricing, strengths, and best-fit use cases.",
        body: `# ChatGPT vs Claude

- [ChatGPT](/tools/chatgpt?locale=en)
- [Claude](/tools/claude?locale=en)
`,
      },
    },
    {
      slug: "ai-tools-ranking-2026",
      kind: "ranking",
      ja: {
        title: "AIツールランキング2026【総合おすすめ】",
        summary: "テキスト・画像・動画・コーディングなど領域横断で注目ツールをランキング形式で紹介。",
        body: `# AIツールランキング2026

## Top picks
- [ChatGPT](/tools/chatgpt)
- [Midjourney](/tools/midjourney)
- [Runway](/tools/runway)
- [GitHub Copilot](/tools/github-copilot)
- [Perplexity](/tools/perplexity)

## 関連
- [カテゴリー](/categories)
`,
      },
      en: {
        title: "AI tools ranking 2026",
        summary: "Cross-category ranking of standout AI products.",
        body: `# AI tools ranking 2026

- ChatGPT, Midjourney, Runway, Copilot, Perplexity
`,
      },
    },
    {
      slug: "howto-use-chatgpt",
      kind: "howto",
      ja: {
        title: "ChatGPTの使い方｜始め方・活用例・注意点",
        summary: "ChatGPTの始め方から実務活用、料金確認のポイントまで。",
        body: `# ChatGPTの使い方

## 始め方
1. アカウント作成
2. 無料枠で試す
3. プロンプトを具体化する

## 詳細ページ
- [ChatGPT](/tools/chatgpt)
`,
      },
      en: {
        title: "How to use ChatGPT",
        summary: "Setup, practical tips, and pricing checkpoints.",
        body: `# How to use ChatGPT

See the [ChatGPT tool page](/tools/chatgpt?locale=en).
`,
      },
    },
    {
      slug: "ai-news-roundup-2026",
      kind: "news",
      ja: {
        title: "最新AIニュースまとめ｜注目アップデート",
        summary: "モデル性能・料金・日本語対応の変化を追うチェックリストと関連ツール。",
        body: `# 最新AIニュースまとめ

## チェックしたいツール
- [Gemini](/tools/gemini)
- [Grok](/tools/xai-grok)
- [Mistral AI](/tools/mistral)

- [AIツール一覧](/tools)
`,
      },
      en: {
        title: "AI news roundup",
        summary: "Tools and themes to watch as models and pricing shift.",
        body: `# AI news roundup

Watch Gemini, Grok, and Mistral.
`,
      },
    },
    {
      slug: "ai-usecases-for-marketing",
      kind: "usecase",
      ja: {
        title: "マーケティングでのAI活用方法",
        summary: "コピー作成・SEO・SNS運用に使えるAIの入れ方とおすすめツール。",
        body: `# マーケティングでのAI活用方法

## おすすめツール
- [Jasper](/tools/jasper)
- [Copy.ai](/tools/copy-ai)
- [Surfer SEO](/tools/surfer)
- [Buffer](/tools/buffer-ai)

- [マーケカテゴリー](/categories/marketing)
`,
      },
      en: {
        title: "AI use cases for marketing",
        summary: "Copy, SEO, and social workflows with matching tools.",
        body: `# AI use cases for marketing

Jasper, Copy.ai, Surfer, Buffer.
`,
      },
    },
  ] as const;

  for (const article of sampleArticles) {
    const row = await prisma.article.upsert({
      where: { slug: article.slug },
      create: {
        slug: article.slug,
        kind: article.kind,
        status: "published",
        publishedAt: new Date(),
      },
      update: {
        kind: article.kind,
        status: "published",
        publishedAt: new Date(),
      },
    });
    for (const locale of ["ja", "en"] as const) {
      const tr = article[locale];
      await prisma.articleTranslation.upsert({
        where: { articleId_locale: { articleId: row.id, locale } },
        create: {
          articleId: row.id,
          locale,
          title: tr.title,
          summary: tr.summary,
          body: tr.body,
          seoTitle: `${tr.title} | AI BASE`,
          seoDescription: tr.summary.slice(0, 155),
        },
        update: {
          title: tr.title,
          summary: tr.summary,
          body: tr.body,
          seoTitle: `${tr.title} | AI BASE`,
          seoDescription: tr.summary.slice(0, 155),
        },
      });
    }
  }

  console.log(
    `Seeded ${toolIds.length} published tools + monetization links + ${sampleArticles.length} articles`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
