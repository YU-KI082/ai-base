import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { repos } from "@ai-base/database";
import { cachedJson } from "@ai-base/cache";
import {
  asStringList,
  normalizeFaq,
  pickTranslation,
  primaryAffiliate,
} from "@/lib/tool-detail";
import { absoluteUrl, resolvePublicLocale, withLocale } from "@/lib/site";
import {
  faqPageJsonLd,
  localeAlternatesFor,
  softwareApplicationJsonLd,
} from "@/lib/seo";
import { getDictionary } from "@ai-base/i18n";

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
  const pub = getDictionary(locale).public;
  if (!tool || tool.status !== "published") {
    return { title: `${pub.notFound} | AI BASE` };
  }
  const translation = pickTranslation(tool.translations, locale);
  const title = translation?.seoTitle || `${translation?.name ?? slug} | AI BASE`;
  const description =
    translation?.seoDescription ||
    translation?.description?.slice(0, 155) ||
    pub.toolFallbackDescription;
  const url = absoluteUrl(withLocale(`/tools/${slug}`, locale));
  return {
    title,
    description,
    alternates: localeAlternatesFor(`/tools/${slug}`, locale),
    openGraph: {
      title,
      description,
      url,
      siteName: "AI BASE",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
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
  const t = getDictionary(locale).public;
  const tool = await cachedJson(`page:tool:${slug}`, 60, () =>
    repos.tools.findBySlug(slug),
  );
  if (!tool || tool.status !== "published") notFound();

  const translation = pickTranslation(tool.translations, locale);
  const features = asStringList(translation?.features);
  const pros = asStringList(translation?.pros);
  const cons = asStringList(translation?.cons);
  const faq = normalizeFaq(translation?.faq);
  const affiliate = primaryAffiliate(tool.affiliateLinks);
  const ctaHref = affiliate ? `/go/${affiliate.id}` : tool.homepageUrl;
  const ctaLabel = affiliate?.label || t.visitWebsite;

  const categoryLinks = tool.categories.map((c) => {
    const tr = pickTranslation(c.category.translations, locale);
    return { key: c.category.key, name: tr?.name ?? c.category.key };
  });

  const pageUrl = absoluteUrl(withLocale(`/tools/${slug}`, locale));
  const softwareLd =
    translation?.schemaJson && typeof translation.schemaJson === "object"
      ? (translation.schemaJson as Record<string, unknown>)
      : softwareApplicationJsonLd({
          name: translation?.name ?? tool.slug,
          description: translation?.description,
          url: pageUrl,
        });
  const faqLd = faqPageJsonLd(faq);

  const otherTools = (
    await repos.tools.findPublished(locale, { take: 40 })
  ).filter((t) => t.slug !== slug);

  const metaBits = [
    tool.pricingModel !== "unknown" ? tool.pricingModel : null,
    tool.hasFreePlan ? t.freePlan : null,
    tool.hasApi ? t.api : null,
  ].filter(Boolean);

  return (
    <main className="container site-section animate-in">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareLd) }}
      />
      {faqLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      ) : null}

      <Link className="muted" href={withLocale("/tools", locale)} style={{ fontSize: 14 }}>
        ← {t.backToTools}
      </Link>

      <div className="page-header" style={{ marginTop: "1rem", alignItems: "start" }}>
        <div style={{ maxWidth: "62ch" }}>
          <h1 className="page-title">{translation?.name ?? tool.slug}</h1>
          {metaBits.length > 0 ? (
            <p className="muted" style={{ margin: "0.55rem 0 0", fontSize: 14 }}>
              {metaBits.join(" · ")}
            </p>
          ) : null}
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <a
            className="btn btn-primary"
            href={ctaHref}
            rel="nofollow sponsored noopener"
            target="_blank"
          >
            {ctaLabel}
          </a>
          <Link
            className="btn btn-ghost"
            href={withLocale(
              `/compare?tools=${slug}${otherTools[0] ? `,${otherTools[0].slug}` : ""}`,
              locale,
            )}
          >
            {t.navCompare}
          </Link>
        </div>
      </div>

      {categoryLinks.length > 0 ? (
        <div className="filter-row" style={{ marginTop: "1rem" }}>
          {categoryLinks.map((c) => (
            <Link
              key={c.key}
              className="chip"
              href={withLocale(`/categories/${c.key}`, locale)}
            >
              {c.name}
            </Link>
          ))}
        </div>
      ) : null}

      <p
        style={{
          maxWidth: "66ch",
          marginTop: "1.5rem",
          lineHeight: 1.7,
          fontSize: "1.05rem",
          color: "var(--text)",
        }}
      >
        {translation?.description}
      </p>

      <div className="grid-2" style={{ marginTop: "1.75rem" }}>
        <section className="card-surface" style={{ padding: "1.15rem 1.25rem" }}>
          <h2 style={{ marginTop: 0, fontSize: "1.05rem", letterSpacing: "-0.02em" }}>
            {t.features}
          </h2>
          <ul style={{ margin: 0, paddingLeft: "1.1rem", lineHeight: 1.65 }}>
            {features.length === 0 ? (
              <li className="muted">{t.toolsEmpty}</li>
            ) : (
              features.map((f) => <li key={f}>{f}</li>)
            )}
          </ul>
        </section>
        <section className="card-surface" style={{ padding: "1.15rem 1.25rem" }}>
          <h2 style={{ marginTop: 0, fontSize: "1.05rem", letterSpacing: "-0.02em" }}>
            {`${t.pros} / ${t.cons}`}
          </h2>
          <p style={{ marginBottom: 0.35, fontWeight: 600, fontSize: 14 }}>
            {t.pros}
          </p>
          <ul style={{ marginTop: 0, paddingLeft: "1.1rem", lineHeight: 1.65 }}>
            {pros.length === 0 ? (
              <li className="muted">—</li>
            ) : (
              pros.map((f) => <li key={f}>{f}</li>)
            )}
          </ul>
          <p style={{ marginBottom: 0.35, fontWeight: 600, fontSize: 14 }}>
            {t.cons}
          </p>
          <ul style={{ marginTop: 0, paddingLeft: "1.1rem", lineHeight: 1.65 }}>
            {cons.length === 0 ? (
              <li className="muted">—</li>
            ) : (
              cons.map((f) => <li key={f}>{f}</li>)
            )}
          </ul>
        </section>
      </div>

      {faq.length > 0 ? (
        <section style={{ marginTop: "2rem" }}>
          <h2 style={{ fontSize: "1.15rem", letterSpacing: "-0.02em" }}>
            {t.faq}
          </h2>
          <div style={{ display: "grid", gap: "0.65rem" }}>
            {faq.map((item, i) => (
              <details
                key={`${item.question}-${i}`}
                className="card-surface"
                style={{ padding: "0.9rem 1.1rem" }}
              >
                <summary style={{ cursor: "pointer", fontWeight: 600 }}>
                  {item.question}
                </summary>
                <p className="muted" style={{ margin: "0.65rem 0 0", lineHeight: 1.6 }}>
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </section>
      ) : null}

      {otherTools.length > 0 ? (
        <section style={{ marginTop: "2.25rem" }}>
          <h2 style={{ fontSize: "1.15rem", letterSpacing: "-0.02em" }}>
            {t.compareWith}
          </h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
            {otherTools.slice(0, 8).map((other) => (
              <Link
                key={other.id}
                className="chip"
                href={withLocale(`/compare?tools=${slug},${other.slug}`, locale)}
              >
                {t.vsPrefix}
                {other.translations[0]?.name ?? other.slug}
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
