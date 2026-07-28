import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
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
  const comparison = await repos.comparisons.findBySlug(slug, locale);
  if (!comparison || comparison.status !== "published") {
    return { title: "Not found | AI BASE" };
  }
  const tr = comparison.translations[0];
  const title = tr?.title ? `${tr.title} | AI BASE` : `${slug} | AI BASE`;
  return {
    title,
    description: tr?.summary,
    alternates: { canonical: absoluteUrl(withLocale(`/compare/${slug}`, locale)) },
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
  const comparison = await repos.comparisons.findBySlug(slug, locale);
  if (!comparison || comparison.status !== "published") notFound();
  const tr = comparison.translations[0];
  const toolSlugs = comparison.items.map((i) => i.tool.slug).join(",");

  return (
    <main className="container site-section">
      <Link className="muted" href={withLocale("/compare", locale)}>
        ← {locale === "ja" ? "比較" : "Compare"}
      </Link>
      <h1 style={{ fontFamily: "var(--font-display-loaded), serif" }}>
        {tr?.title ?? comparison.slug}
      </h1>
      <p style={{ maxWidth: "70ch" }}>{tr?.summary}</p>
      {tr?.recommendation ? (
        <p className="card-surface" style={{ padding: "1rem", maxWidth: "70ch" }}>
          <strong>{locale === "ja" ? "おすすめ" : "Recommendation"}: </strong>
          {tr.recommendation}
        </p>
      ) : null}
      <p>
        <Link className="btn btn-primary" href={withLocale(`/compare?tools=${toolSlugs}`, locale)}>
          {locale === "ja" ? "比較表を開く" : "Open comparison table"}
        </Link>
      </p>
      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "0.5rem" }}>
        {comparison.items.map((item) => {
          const name = item.tool.translations[0]?.name ?? item.tool.slug;
          return (
            <li key={item.id}>
              <Link href={withLocale(`/tools/${item.tool.slug}`, locale)}>{name}</Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
