import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { repos } from "@ai-base/database";
import { ToolCard } from "@/components/tool-card";
import { absoluteUrl, resolvePublicLocale, withLocale } from "@/lib/site";

export const revalidate = 60;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ locale?: string }>;
}): Promise<Metadata> {
  const { key } = await params;
  const locale = resolvePublicLocale((await searchParams).locale);
  const category = await repos.categories.findByKey(key, locale);
  if (!category) return { title: "Not found | AI BASE" };
  const name = category.translations[0]?.name ?? key;
  const title = `${name} | AI BASE`;
  return {
    title,
    description: category.translations[0]?.description ?? undefined,
    alternates: { canonical: absoluteUrl(withLocale(`/categories/${key}`, locale)) },
  };
}

export default async function CategoryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ locale?: string }>;
}) {
  const { key } = await params;
  const locale = resolvePublicLocale((await searchParams).locale);
  const category = await repos.categories.findByKey(key, locale);
  if (!category) notFound();
  const tools = await repos.tools.findPublished(locale, {
    categoryKey: key,
    take: 50,
  });
  const name = category.translations[0]?.name ?? key;

  return (
    <main className="container site-section">
      <Link className="muted" href={withLocale("/categories", locale)}>
        ← {locale === "ja" ? "カテゴリ" : "Categories"}
      </Link>
      <h1 style={{ fontFamily: "var(--font-display-loaded), serif" }}>{name}</h1>
      <p className="muted">{category.translations[0]?.description}</p>
      <ul style={{ listStyle: "none", padding: 0, marginTop: "1.25rem", display: "grid", gap: "0.75rem" }}>
        {tools.length === 0 ? (
          <li className="muted">
            {locale === "ja" ? "このカテゴリの公開ツールはまだありません。" : "No published tools in this category yet."}
          </li>
        ) : (
          tools.map((tool) => {
            const t = tool.translations[0];
            return (
              <ToolCard
                key={tool.id}
                locale={locale}
                slug={tool.slug}
                name={t?.name ?? tool.slug}
                description={t?.description}
                pricingModel={tool.pricingModel}
              />
            );
          })
        )}
      </ul>
    </main>
  );
}
