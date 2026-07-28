import { PrismaClient } from "@prisma/client";

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
      locale: "en",
    },
    update: {},
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

  // Demo published catalog so public MVP is reviewable after seed.
  const demoTools = [
    {
      slug: "notion-ai",
      homepageUrl: "https://www.notion.so/product/ai",
      pricingModel: "freemium" as const,
      hasFreePlan: true,
      hasApi: false,
      categoryKey: "productivity",
      en: {
        name: "Notion AI",
        description:
          "Writing and knowledge assistant embedded in Notion workspaces for notes, docs, and wikis.",
        features: ["Workspace AI", "Summaries", "Q&A on docs"],
        pros: ["Deep Notion integration", "Team knowledge"],
        cons: ["Best inside Notion", "Usage limits on lower plans"],
      },
      ja: {
        name: "Notion AI",
        description:
          "Notionワークスペースに組み込まれた執筆・ナレッジ支援AI。ノートやドキュメントの要約に強み。",
        features: ["ワークスペースAI", "要約", "ドキュメントQ&A"],
        pros: ["Notionとの深い統合", "チームナレッジ"],
        cons: ["Notion外では弱い", "下位プランは利用制限"],
      },
    },
    {
      slug: "chatgpt",
      homepageUrl: "https://chatgpt.com",
      pricingModel: "freemium" as const,
      hasFreePlan: true,
      hasApi: true,
      categoryKey: "text",
      en: {
        name: "ChatGPT",
        description:
          "General-purpose conversational AI for drafting, coding help, research, and multimodal tasks.",
        features: ["Chat", "Custom GPTs", "API ecosystem"],
        pros: ["Broad capability", "Fast iteration"],
        cons: ["Hallucinations", "Plan-dependent limits"],
      },
      ja: {
        name: "ChatGPT",
        description:
          "文章作成・コーディング支援・調査などに使える汎用対話AI。マルチモーダルにも対応。",
        features: ["チャット", "Custom GPTs", "APIエコシステム"],
        pros: ["幅広い用途", "速い試行錯誤"],
        cons: ["幻覚", "プラン依存の制限"],
      },
    },
    {
      slug: "midjourney",
      homepageUrl: "https://www.midjourney.com",
      pricingModel: "paid" as const,
      hasFreePlan: false,
      hasApi: false,
      categoryKey: "image",
      en: {
        name: "Midjourney",
        description:
          "High-quality text-to-image generation popular for concept art, branding, and creative exploration.",
        features: ["Image generation", "Style controls", "Community gallery"],
        pros: ["Aesthetic quality", "Creative community"],
        cons: ["Paid-only", "Discord-centric workflow"],
      },
      ja: {
        name: "Midjourney",
        description:
          "コンセプトアートやブランディングに使われる高品質な画像生成AI。",
        features: ["画像生成", "スタイル制御", "コミュニティギャラリー"],
        pros: ["美的品質", "クリエイティブコミュニティ"],
        cons: ["有料のみ", "Discord中心の運用"],
      },
    },
  ];

  const toolIds: string[] = [];
  for (const demo of demoTools) {
    const category = await prisma.category.findUnique({
      where: { key: demo.categoryKey },
    });
    const tool = await prisma.aiTool.upsert({
      where: { slug: demo.slug },
      create: {
        slug: demo.slug,
        homepageUrl: demo.homepageUrl,
        pricingModel: demo.pricingModel,
        hasFreePlan: demo.hasFreePlan,
        hasApi: demo.hasApi,
        status: "published",
        publishedAt: new Date(),
        sourceName: "seed",
      },
      update: {
        homepageUrl: demo.homepageUrl,
        pricingModel: demo.pricingModel,
        hasFreePlan: demo.hasFreePlan,
        hasApi: demo.hasApi,
        status: "published",
        publishedAt: new Date(),
      },
    });
    toolIds.push(tool.id);

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
          seoTitle: `${t.name} | AI BASE`,
          seoDescription: t.description.slice(0, 155),
          faq: [
            {
              q: locale === "ja" ? `${t.name}とは？` : `What is ${t.name}?`,
              a: t.description,
            },
          ],
          schemaJson: {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: t.name,
            description: t.description,
            applicationCategory: "BusinessApplication",
            url: `https://ai-base.local/tools/${demo.slug}`,
          },
        },
        update: {
          name: t.name,
          description: t.description,
          features: t.features,
          pros: t.pros,
          cons: t.cons,
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

    const existingAff = await prisma.affiliateLink.findFirst({
      where: { toolId: tool.id, label: "Official site" },
    });
    if (!existingAff) {
      await prisma.affiliateLink.create({
        data: {
          toolId: tool.id,
          label: "Official site",
          url: demo.homepageUrl,
          network: "direct",
          priority: 100,
          isHealthy: true,
        },
      });
    }
  }

  if (toolIds.length >= 2) {
    const slug = "chatgpt-vs-notion-ai";
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
    await prisma.comparisonItem.deleteMany({ where: { comparisonId: comparison.id } });
    await prisma.comparisonItem.createMany({
      data: [
        {
          comparisonId: comparison.id,
          toolId: toolIds[1]!,
          side: "left",
          sortOrder: 0,
        },
        {
          comparisonId: comparison.id,
          toolId: toolIds[0]!,
          side: "right",
          sortOrder: 1,
        },
      ],
    });
  }

  console.log("Seed completed");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
