import { z } from "zod";
import { repos } from "@ai-base/database";
import { withAdmin } from "@/app/api/v1/_lib/admin";
import { jsonError, jsonOk, readJsonSchema } from "@/app/api/v1/_lib/http";
import {
  ARTICLE_KINDS,
  generateArticleContent,
  type ArticleKind,
} from "@/lib/article-generate";

const UpsertSchema = z.object({
  id: z.string().optional(),
  slug: z.string().min(1).max(160).optional(),
  kind: z.enum([
    "recommend",
    "compare",
    "howto",
    "ranking",
    "news",
    "usecase",
    "guide",
  ]),
  status: z.enum(["draft", "published", "archived"]).optional(),
  generate: z.boolean().optional(),
  topic: z.string().max(120).optional(),
  toolSlugs: z.array(z.string()).max(20).optional(),
  ja: z
    .object({
      title: z.string().min(1),
      summary: z.string().min(1),
      body: z.string().min(1),
    })
    .optional(),
  en: z
    .object({
      title: z.string().min(1),
      summary: z.string().min(1),
      body: z.string().min(1),
    })
    .optional(),
});

export async function GET(request: Request) {
  return withAdmin(request, "tools.read", async () => {
    const items = await repos.articles.listAll(200);
    return jsonOk({ items, kinds: ARTICLE_KINDS });
  });
}

export async function POST(request: Request) {
  return withAdmin(request, "settings.manage", async () => {
    let body: z.infer<typeof UpsertSchema>;
    try {
      body = await readJsonSchema(request, UpsertSchema);
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : String(error), 400);
    }

    let ja = body.ja;
    let en = body.en;
    let slug = body.slug;

    if (body.generate || !ja) {
      const slugs = body.toolSlugs?.length
        ? body.toolSlugs
        : (await repos.tools.findPublished("ja", { take: 8 })).map((t) => t.slug);
      const tools = await repos.tools.findPublishedBySlugs(slugs, "ja");
      const briefs = tools.map((t) => ({
        slug: t.slug,
        name: t.translations[0]?.name ?? t.slug,
        description: t.translations[0]?.description ?? "",
        pricingModel: t.pricingModel,
        categoryKey: t.categories[0]?.category.key,
      }));
      const jaGen = generateArticleContent({
        kind: body.kind as ArticleKind,
        tools: briefs,
        topic: body.topic,
        locale: "ja",
      });
      const enBriefs = (
        await repos.tools.findPublishedBySlugs(
          briefs.map((b) => b.slug),
          "en",
        )
      ).map((t) => ({
        slug: t.slug,
        name: t.translations[0]?.name ?? t.slug,
        description: t.translations[0]?.description ?? "",
        pricingModel: t.pricingModel,
      }));
      const enGen = generateArticleContent({
        kind: body.kind as ArticleKind,
        tools: enBriefs.length ? enBriefs : briefs,
        topic: body.topic,
        locale: "en",
      });
      ja = { title: jaGen.title, summary: jaGen.summary, body: jaGen.body };
      en = { title: enGen.title, summary: enGen.summary, body: enGen.body };
      slug = slug || jaGen.slug;
    }

    if (!ja || !slug) {
      return jsonError("title/summary/body or generate required", 400);
    }

    const item = await repos.articles.upsert({
      id: body.id,
      slug,
      kind: body.kind,
      status: body.status ?? "published",
      ja,
      en,
    });
    return jsonOk({ item }, { status: body.id ? 200 : 201 });
  });
}
