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
          url: `${site}/tools/${demo.slug}`,
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

  console.log(`Seeded ${toolIds.length} published tools + monetization links`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
