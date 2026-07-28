import type { MetadataRoute } from "next";
import { repos } from "@ai-base/database";
import { siteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const [tools, comparisons, categories] = await Promise.all([
    repos.tools.listPublishedSlugs(),
    repos.comparisons.findPublished(),
    repos.categories.list(),
  ]);

  /** Bare URL = Japanese (default); ?locale=en = English */
  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/tools",
    "/search",
    "/categories",
    "/compare",
  ].flatMap((path) => [
    {
      url: `${base}${path}`,
      changeFrequency: path === "" ? "daily" : "hourly",
      priority: path === "" ? 1 : 0.8,
    },
    {
      url: `${base}${path}?locale=en`,
      changeFrequency: "hourly",
      priority: 0.7,
    },
  ]);

  const toolRoutes = tools.flatMap((t) => [
    {
      url: `${base}/tools/${t.slug}`,
      lastModified: t.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.9,
    },
    {
      url: `${base}/tools/${t.slug}?locale=en`,
      lastModified: t.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.85,
    },
  ]);

  const categoryRoutes = categories.flatMap((c) => [
    { url: `${base}/categories/${c.key}`, changeFrequency: "weekly" as const, priority: 0.6 },
    {
      url: `${base}/categories/${c.key}?locale=en`,
      changeFrequency: "weekly" as const,
      priority: 0.55,
    },
  ]);

  const comparisonRoutes = comparisons.flatMap((c) => [
    {
      url: `${base}/compare/${c.slug}`,
      lastModified: c.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    },
    {
      url: `${base}/compare/${c.slug}?locale=en`,
      lastModified: c.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.65,
    },
  ]);

  return [...staticRoutes, ...toolRoutes, ...categoryRoutes, ...comparisonRoutes];
}
