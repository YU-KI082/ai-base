import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary } from "@ai-base/i18n";
import { repos } from "@ai-base/database";
import { cachedJson } from "@ai-base/cache";
import { absoluteUrl, resolvePublicLocale, withLocale } from "@/lib/site";

export const revalidate = 300;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ locale?: string }>;
}): Promise<Metadata> {
  const locale = resolvePublicLocale((await searchParams).locale);
  const t = getDictionary(locale).public;
  return {
    title: `${t.categoriesTitle} | AI BASE`,
    description: t.categoriesDescription,
    alternates: { canonical: absoluteUrl(withLocale("/categories", locale)) },
  };
}

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ locale?: string }>;
}) {
  const locale = resolvePublicLocale((await searchParams).locale);
  const t = getDictionary(locale).public;
  const categories = await cachedJson(`page:categories:${locale}`, 300, () =>
    repos.categories.list(locale),
  );

  return (
    <main className="container site-section">
      <h1 style={{ fontFamily: "var(--font-display-loaded), serif", marginTop: 0 }}>
        {t.categoriesTitle}
      </h1>
      <p className="muted">{t.categoriesIntro}</p>
      {categories.length === 0 ? (
        <p className="muted" style={{ marginTop: "1.25rem" }}>
          {t.categoriesEmpty}
        </p>
      ) : (
        <div className="grid-3" style={{ marginTop: "1.25rem" }}>
          {categories.map((cat) => {
            const tr = cat.translations[0];
            return (
              <Link
                key={cat.id}
                href={withLocale(`/categories/${cat.key}`, locale)}
                className="card-surface"
                style={{ padding: "1.1rem 1.2rem", display: "block" }}
              >
                <strong>{tr?.name ?? cat.key}</strong>
                <p className="muted" style={{ margin: "0.4rem 0 0", fontSize: 14 }}>
                  {tr?.description}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
