import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary, tf } from "@ai-base/i18n";
import { repos } from "@ai-base/database";
import { cachedJson } from "@ai-base/cache";
import { ToolCard } from "@/components/tool-card";
import { absoluteUrl, resolvePublicLocale, withLocale } from "@/lib/site";
import { localeAlternatesFor } from "@/lib/seo";

export const revalidate = 60;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ locale?: string }>;
}): Promise<Metadata> {
  const locale = resolvePublicLocale((await searchParams).locale);
  const t = getDictionary(locale).public;
  const title = `${t.toolsTitle} | AI BASE`;
  return {
    title,
    description: t.toolsDescription,
    alternates: localeAlternatesFor("/tools", locale),
    openGraph: {
      title,
      description: t.toolsDescription,
      url: absoluteUrl(withLocale("/tools", locale)),
      siteName: "AI BASE",
    },
  };
}

export default async function ToolsPage({
  searchParams,
}: {
  searchParams: Promise<{ locale?: string; category?: string; q?: string }>;
}) {
  const params = await searchParams;
  const locale = resolvePublicLocale(params.locale);
  const t = getDictionary(locale).public;
  const categoryKey = params.category?.trim() || undefined;
  const q = params.q?.trim() || undefined;

  const [tools, categories] = await Promise.all([
    cachedJson(
      `page:tools:${locale}:${categoryKey ?? ""}:${q ?? ""}`,
      60,
      () =>
        repos.tools.findPublished(locale, {
          take: 50,
          categoryKey,
          q,
        }),
    ),
    cachedJson(`page:categories:${locale}`, 300, () =>
      repos.categories.list(locale),
    ),
  ]);

  return (
    <main className="container site-section">
      <div className="page-header">
        <div>
          <p className="page-kicker">{t.featured ?? t.toolsTitle}</p>
          <h1 className="page-title">{t.navTools}</h1>
          <p className="page-subtitle">{t.toolsDescription}</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <span className="muted" style={{ fontSize: 13 }}>
            {tf(t.toolsCount, { n: tools.length })}
          </span>
          <Link className="btn btn-primary" href={withLocale("/search", locale)}>
            {t.navSearch}
          </Link>
        </div>
      </div>

      <div className="filter-row" role="navigation" aria-label={t.navCategories}>
        <Link
          className={`chip ${!categoryKey ? "chip-active" : ""}`}
          href={withLocale("/tools", locale)}
        >
          {t.allCategories}
        </Link>
        {categories.map((cat) => {
          const name = cat.translations[0]?.name ?? cat.key;
          const active = categoryKey === cat.key;
          return (
            <Link
              key={cat.id}
              className={`chip ${active ? "chip-active" : ""}`}
              href={withLocale(`/tools?category=${encodeURIComponent(cat.key)}`, locale)}
            >
              {name}
            </Link>
          );
        })}
      </div>

      {tools.length === 0 ? (
        <div className="empty-state" style={{ marginTop: "1.5rem" }}>
          {t.toolsEmpty}
        </div>
      ) : (
        <ul className="tools-grid">
          {tools.map((tool) => {
            const tr = tool.translations[0];
            const categoryNames = tool.categories.map((c) => {
              const ctr = c.category.translations?.find((x) => x.locale === locale);
              return ctr?.name ?? c.category.key;
            });
            return (
              <ToolCard
                key={tool.id}
                locale={locale}
                slug={tool.slug}
                name={tr?.name ?? tool.slug}
                description={tr?.description}
                pricingModel={tool.pricingModel}
                categoryNames={categoryNames}
              />
            );
          })}
        </ul>
      )}
    </main>
  );
}
