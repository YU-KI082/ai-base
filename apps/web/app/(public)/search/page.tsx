import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary } from "@ai-base/i18n";
import { repos } from "@ai-base/database";
import { ToolCard } from "@/components/tool-card";
import { resolvePublicLocale, withLocale } from "@/lib/site";
import { localeAlternatesFor } from "@/lib/seo";

export const revalidate = 30;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ locale?: string; q?: string }>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const locale = resolvePublicLocale(sp.locale);
  const t = getDictionary(locale).public;
  return {
    title: `${t.searchTitle} | AI BASE`,
    description: t.searchDescription,
    alternates: localeAlternatesFor("/search", locale),
  };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ locale?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const locale = resolvePublicLocale(sp.locale);
  const t = getDictionary(locale).public;
  const q = (sp.q ?? "").trim();
  const items = q
    ? await repos.tools.findPublished(locale, { q, take: 30 })
    : [];

  return (
    <main className="container site-section animate-in">
      <div className="page-header">
        <div>
          <p className="page-kicker">{t.searchTitle}</p>
          <h1 className="page-title">{t.searchTitle}</h1>
          <p className="page-subtitle">{t.searchDescription}</p>
        </div>
      </div>

      <form
        action="/search"
        method="get"
        className="card-surface"
        style={{
          marginTop: "1.5rem",
          padding: "0.85rem",
          display: "flex",
          gap: "0.5rem",
          flexWrap: "wrap",
          alignItems: "center",
          maxWidth: 720,
        }}
      >
        {locale === "en" ? <input type="hidden" name="locale" value="en" /> : null}
        <input
          name="q"
          defaultValue={q}
          placeholder={t.searchPlaceholder}
          aria-label={t.searchSubmit}
          style={{
            flex: "1 1 240px",
            background: "var(--bg)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            borderRadius: 999,
            padding: "0.75rem 1rem",
          }}
        />
        <button className="btn btn-primary" type="submit">
          {t.searchSubmit}
        </button>
      </form>

      {!q ? (
        <p className="muted" style={{ marginTop: "1.25rem" }}>
          {t.searchPlaceholder}
        </p>
      ) : items.length === 0 ? (
        <div className="empty-state" style={{ marginTop: "1.25rem" }}>
          {t.searchEmpty}{" "}
          <Link href={withLocale("/tools", locale)}>{t.browseTools}</Link>
        </div>
      ) : (
        <ul className="tools-grid">
          {items.map((tool) => {
            const tr = tool.translations[0];
            return (
              <ToolCard
                key={tool.id}
                locale={locale}
                slug={tool.slug}
                name={tr?.name ?? tool.slug}
                description={tr?.description}
                pricingModel={tool.pricingModel}
              />
            );
          })}
        </ul>
      )}
    </main>
  );
}
