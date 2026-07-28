import type { Metadata } from "next";
import Link from "next/link";
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
  const title = locale === "ja" ? "AIツール一覧 | AI BASE" : "AI Tools | AI BASE";
  const description =
    locale === "ja"
      ? "エージェントが評価し、人が承認したAIツールを探す"
      : "Discover AI tools evaluated by agents and approved by humans";
  return {
    title,
    description,
    alternates: localeAlternatesFor("/tools", locale),
    openGraph: {
      title,
      description,
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

  const copy =
    locale === "ja"
      ? {
          kicker: "カタログ",
          title: "AIツール",
          subtitle: "継続評価され、人が承認したツールだけを掲載しています。",
          empty: "まだ公開されたツールがありません。",
          all: "すべて",
          search: "検索",
          count: `${tools.length}件`,
        }
      : {
          kicker: "Catalog",
          title: "AI tools",
          subtitle: "Only tools evaluated by agents and approved by humans.",
          empty: "No published tools yet.",
          all: "All",
          search: "Search",
          count: `${tools.length} tools`,
        };

  return (
    <main className="container site-section">
      <div className="page-header">
        <div>
          <p className="page-kicker">{copy.kicker}</p>
          <h1 className="page-title">{copy.title}</h1>
          <p className="page-subtitle">{copy.subtitle}</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <span className="muted" style={{ fontSize: 13 }}>
            {copy.count}
          </span>
          <Link className="btn btn-primary" href={withLocale("/search", locale)}>
            {copy.search}
          </Link>
        </div>
      </div>

      <div className="filter-row" role="navigation" aria-label={locale === "ja" ? "カテゴリ" : "Categories"}>
        <Link
          className={`chip ${!categoryKey ? "chip-active" : ""}`}
          href={withLocale("/tools", locale)}
        >
          {copy.all}
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
          {copy.empty}
        </div>
      ) : (
        <ul className="tools-grid">
          {tools.map((tool) => {
            const t = tool.translations[0];
            const categoryNames = tool.categories.map((c) => {
              const tr = c.category.translations?.find((x) => x.locale === locale);
              return tr?.name ?? c.category.key;
            });
            return (
              <ToolCard
                key={tool.id}
                locale={locale}
                slug={tool.slug}
                name={t?.name ?? tool.slug}
                description={t?.description}
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
