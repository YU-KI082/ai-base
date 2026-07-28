import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { repos } from "@ai-base/database";
import { cachedJson } from "@ai-base/cache";
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
  const tool = await cachedJson(`page:tool:${slug}`, 60, () =>
    repos.tools.findBySlug(slug),
  );
  if (!tool || tool.status !== "published") {
    return { title: "Not found | AI BASE" };
  }
  const translation =
    tool.translations.find((t) => t.locale === locale) ?? tool.translations[0];
  const title = translation?.seoTitle || `${translation?.name ?? slug} | AI BASE`;
  const description =
    translation?.seoDescription ||
    translation?.description?.slice(0, 155) ||
    "AI tool on AI BASE";
  const url = absoluteUrl(withLocale(`/tools/${slug}`, locale));
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "AI BASE",
      type: "website",
    },
  };
}

export default async function ToolDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ locale?: string }>;
}) {
  const { slug } = await params;
  const locale = resolvePublicLocale((await searchParams).locale);
  const tool = await cachedJson(`page:tool:${slug}`, 60, () =>
    repos.tools.findBySlug(slug),
  );
  if (!tool || tool.status !== "published") notFound();

  const translation =
    tool.translations.find((t) => t.locale === locale) ?? tool.translations[0];
  const features = (translation?.features as string[]) ?? [];
  const pros = (translation?.pros as string[]) ?? [];
  const cons = (translation?.cons as string[]) ?? [];
  const faq = (translation?.faq as Array<{ q?: string; a?: string; question?: string; answer?: string }>) ?? [];
  const affiliate = [...tool.affiliateLinks]
    .filter((l) => l.isHealthy)
    .sort((a, b) => b.priority - a.priority)[0];
  const ctaHref = affiliate ? `/go/${affiliate.id}` : tool.homepageUrl;
  const ctaLabel =
    affiliate?.label ||
    (locale === "ja" ? "公式サイトを開く" : "Visit website");

  const categoryLinks = tool.categories.map((c) => {
    const tr =
      c.category.translations.find((t) => t.locale === locale) ??
      c.category.translations[0];
    return { key: c.category.key, name: tr?.name ?? c.category.key };
  });

  const jsonLd =
    translation?.schemaJson && typeof translation.schemaJson === "object"
      ? translation.schemaJson
      : {
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: translation?.name ?? tool.slug,
          description: translation?.description,
          url: absoluteUrl(withLocale(`/tools/${slug}`, locale)),
          applicationCategory: "BusinessApplication",
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
          },
        };

  const otherTools = (
    await repos.tools.findPublished(locale, { take: 40 })
  ).filter((t) => t.slug !== slug);

  return (
    <main className="container site-section">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Link className="muted" href={withLocale("/tools", locale)}>
        ← {locale === "ja" ? "ツール一覧" : "Tools"}
      </Link>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "start", flexWrap: "wrap", marginTop: "0.75rem" }}>
        <div style={{ maxWidth: "70ch" }}>
          <h1 style={{ fontFamily: "var(--font-display-loaded), serif", margin: "0 0 0.35rem" }}>
            {translation?.name ?? tool.slug}
          </h1>
          <p className="muted" style={{ margin: 0 }}>
            {tool.pricingModel !== "unknown" ? tool.pricingModel : null}
            {tool.hasFreePlan ? (locale === "ja" ? " · 無料プランあり" : " · Free plan") : null}
            {tool.hasApi ? " · API" : null}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <a className="btn btn-primary" href={ctaHref} rel="nofollow sponsored noopener" target="_blank">
            {ctaLabel}
          </a>
          <Link
            className="btn btn-ghost"
            href={withLocale(
              `/compare?tools=${slug}${otherTools[0] ? `,${otherTools[0].slug}` : ""}`,
              locale,
            )}
          >
            {locale === "ja" ? "比較する" : "Compare"}
          </Link>
        </div>
      </div>

      {categoryLinks.length > 0 ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "1rem" }}>
          {categoryLinks.map((c) => (
            <Link key={c.key} className="pill" href={withLocale(`/categories/${c.key}`, locale)}>
              {c.name}
            </Link>
          ))}
        </div>
      ) : null}

      <p style={{ maxWidth: "70ch", marginTop: "1.25rem", lineHeight: 1.65 }}>
        {translation?.description}
      </p>

      <div className="grid-2" style={{ marginTop: "1.5rem" }}>
        <section className="card-surface" style={{ padding: "1rem 1.15rem" }}>
          <h2 style={{ marginTop: 0 }}>{locale === "ja" ? "機能" : "Features"}</h2>
          <ul>
            {features.length === 0 ? (
              <li className="muted">{locale === "ja" ? "未掲載" : "Not listed"}</li>
            ) : (
              features.map((f) => <li key={f}>{f}</li>)
            )}
          </ul>
        </section>
        <section className="card-surface" style={{ padding: "1rem 1.15rem" }}>
          <h2 style={{ marginTop: 0 }}>{locale === "ja" ? "長所 / 短所" : "Pros / Cons"}</h2>
          <p><strong>{locale === "ja" ? "長所" : "Pros"}</strong></p>
          <ul>
            {pros.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <p><strong>{locale === "ja" ? "短所" : "Cons"}</strong></p>
          <ul>
            {cons.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </section>
      </div>

      {faq.length > 0 ? (
        <section style={{ marginTop: "1.75rem" }}>
          <h2>{locale === "ja" ? "よくある質問" : "FAQ"}</h2>
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {faq.map((item, i) => {
              const q = item.q ?? item.question ?? "";
              const a = item.a ?? item.answer ?? "";
              if (!q) return null;
              return (
                <details key={`${q}-${i}`} className="card-surface" style={{ padding: "0.85rem 1rem" }}>
                  <summary style={{ cursor: "pointer", fontWeight: 600 }}>{q}</summary>
                  <p className="muted" style={{ marginBottom: 0 }}>{a}</p>
                </details>
              );
            })}
          </div>
        </section>
      ) : null}

      {otherTools.length > 0 ? (
        <section style={{ marginTop: "2rem" }}>
          <h2>{locale === "ja" ? "ほかのツールと比較" : "Compare with another tool"}</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
            {otherTools.slice(0, 8).map((t) => (
              <Link
                key={t.id}
                className="btn btn-ghost"
                href={withLocale(`/compare?tools=${slug},${t.slug}`, locale)}
                style={{ padding: "0.35rem 0.7rem" }}
              >
                vs {t.translations[0]?.name ?? t.slug}
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
