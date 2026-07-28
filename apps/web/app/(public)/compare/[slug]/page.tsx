import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary } from "@ai-base/i18n";
import { repos } from "@ai-base/database";
import { absoluteUrl, resolvePublicLocale, withLocale } from "@/lib/site";

export const revalidate = 60;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ locale?: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const locale = resolvePublicLocale((await searchParams).locale);
  const t = getDictionary(locale).public;
  const comparison = await repos.comparisons.findBySlug(slug, locale);
  if (!comparison || comparison.status !== "published") {
    return { title: `${t.notFound} | AI BASE` };
  }
  const tr = comparison.translations[0];
  const title = tr?.title ? `${tr.title} | AI BASE` : `${slug} | AI BASE`;
  return {
    title,
    description: tr?.summary,
    alternates: {
      canonical: absoluteUrl(withLocale(`/compare/${slug}`, locale)),
    },
  };
}

export default async function ComparisonDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ locale?: string }>;
}) {
  const { slug } = await params;
  const locale = resolvePublicLocale((await searchParams).locale);
  const t = getDictionary(locale).public;
  const comparison = await repos.comparisons.findBySlug(slug, locale);
  if (!comparison || comparison.status !== "published") notFound();
  const tr = comparison.translations[0];
  const toolSlugs = comparison.items.map((i) => i.tool.slug).join(",");

  return (
    <main className="container site-section animate-in">
      <Link className="muted" href={withLocale("/compare", locale)} style={{ fontSize: 14 }}>
        ← {t.navCompare}
      </Link>
      <h1 className="page-title" style={{ marginTop: "0.85rem" }}>
        {tr?.title ?? comparison.slug}
      </h1>
      <p className="page-subtitle" style={{ maxWidth: "66ch" }}>
        {tr?.summary}
      </p>
      {tr?.recommendation ? (
        <p className="card-surface" style={{ padding: "1rem 1.15rem", maxWidth: "66ch", marginTop: "1.25rem" }}>
          <strong>{t.recommendation}: </strong>
          {tr.recommendation}
        </p>
      ) : null}
      <div style={{ marginTop: "1.25rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <Link className="btn btn-primary" href={withLocale(`/compare?tools=${toolSlugs}`, locale)}>
          {t.openCompareTable}
        </Link>
      </div>
      <ul className="tools-grid" style={{ marginTop: "1.5rem" }}>
        {comparison.items.map((item) => {
          const name = item.tool.translations[0]?.name ?? item.tool.slug;
          return (
            <li key={item.id} className="card-surface tool-card">
              <Link
                href={withLocale(`/tools/${item.tool.slug}`, locale)}
                className="tool-card-link"
              >
                <span className="tool-card-name">{name}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
