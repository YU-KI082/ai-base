import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary } from "@ai-base/i18n";
import { repos } from "@ai-base/database";
import { cachedJson } from "@ai-base/cache";
import { absoluteUrl, resolvePublicLocale, withLocale } from "@/lib/site";
import { breadcrumbListJsonLd, localeAlternatesFor } from "@/lib/seo";

export const revalidate = 60;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ locale?: string }>;
}): Promise<Metadata> {
  const locale = resolvePublicLocale((await searchParams).locale);
  const t = getDictionary(locale).public;
  const title = `${t.articlesTitle} | AI BASE`;
  return {
    title,
    description: t.articlesDescription,
    alternates: localeAlternatesFor("/articles", locale),
    openGraph: {
      title,
      description: t.articlesDescription,
      url: absoluteUrl(withLocale("/articles", locale)),
      siteName: "AI BASE",
      type: "website",
    },
  };
}

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ locale?: string; kind?: string }>;
}) {
  const params = await searchParams;
  const locale = resolvePublicLocale(params.locale);
  const t = getDictionary(locale).public;
  const articles = await cachedJson(`page:articles:${locale}`, 60, () =>
    repos.articles.listPublished(locale, 50),
  );
  const crumbs = breadcrumbListJsonLd([
    { name: t.breadcrumbHome, url: absoluteUrl(withLocale("/", locale)) },
    {
      name: t.navArticles,
      url: absoluteUrl(withLocale("/articles", locale)),
    },
  ]);

  return (
    <main className="container site-section animate-in">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }}
      />
      <nav aria-label="breadcrumb" style={{ fontSize: 13, marginBottom: "0.75rem" }}>
        <Link className="muted" href={withLocale("/", locale)}>
          {t.breadcrumbHome}
        </Link>
        <span className="muted"> / </span>
        <span>{t.navArticles}</span>
      </nav>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t.articlesTitle}</h1>
          <p className="page-subtitle">{t.articlesDescription}</p>
        </div>
        <Link className="btn btn-ghost" href={withLocale("/tools", locale)}>
          {t.navTools}
        </Link>
      </div>

      {articles.length === 0 ? (
        <div className="empty-state" style={{ marginTop: "1.5rem" }}>
          {t.articlesEmpty}
        </div>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "0.85rem", marginTop: "1.5rem" }}>
          {articles.map((article) => {
            const tr = article.translations[0];
            return (
              <li key={article.id} className="card-surface" style={{ padding: "1.1rem 1.25rem" }}>
                <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
                  {article.kind}
                  {article.publishedAt
                    ? ` · ${new Date(article.publishedAt).toLocaleDateString(locale === "ja" ? "ja-JP" : "en-US")}`
                    : ""}
                </div>
                <Link
                  href={withLocale(`/articles/${article.slug}`, locale)}
                  style={{ fontSize: "1.1rem", fontWeight: 600 }}
                >
                  {tr?.title ?? article.slug}
                </Link>
                <p className="muted" style={{ margin: "0.45rem 0 0", lineHeight: 1.6 }}>
                  {tr?.summary}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
