import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
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
  breadcrumbListJsonLd,
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
  const name = translation?.name ?? slug;
  const title =
    translation?.seoTitle ||
    (locale === "ja"
      ? `${name}の特徴・料金・使い方 | AI BASE`
      : `${name} — features, pricing & review | AI BASE`);
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
      locale: locale === "ja" ? "ja_JP" : "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="card-surface" style={{ padding: "1.15rem 1.25rem" }}>
      <h2 style={{ marginTop: 0, fontSize: "1.05rem", letterSpacing: "-0.02em" }}>
        {title}
      </h2>
      {children}
    </section>
  );
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
  const languages = asStringList(translation?.languageSupport);
  const useCases = asStringList(translation?.useCases);
  const recommendedUsers = asStringList(translation?.recommendedUsers);
  const tags = asStringList(translation?.tags);
  const faq = normalizeFaq(translation?.faq);
  const affiliate = primaryAffiliate(tool.affiliateLinks);
  const official = tool.affiliateLinks.find(
    (l) => l.isHealthy && (l.network === "direct" || l.network === "official"),
  );
  const ctaHref = affiliate ? `/go/${affiliate.id}` : tool.homepageUrl;
  const ctaLabel =
    affiliate && affiliate.network && affiliate.network !== "direct"
      ? affiliate.label || t.affiliateCta
      : t.officialSite;
  const officialHref = official
    ? `/go/${official.id}`
    : tool.homepageUrl;

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
          pricingModel: tool.pricingModel,
        });
  const faqLd = faqPageJsonLd(faq);
  const crumbs = breadcrumbListJsonLd([
    { name: t.breadcrumbHome, url: absoluteUrl(withLocale("/", locale)) },
    { name: t.navTools, url: absoluteUrl(withLocale("/tools", locale)) },
    ...(categoryLinks[0]
      ? [
          {
            name: categoryLinks[0].name,
            url: absoluteUrl(
              withLocale(`/categories/${categoryLinks[0].key}`, locale),
            ),
          },
        ]
      : []),
    { name: translation?.name ?? slug, url: pageUrl },
  ]);

  const similar = await repos.tools.findSimilar({
    slug,
    categoryKeys: categoryLinks.map((c) => c.key),
    locale,
    take: 8,
  });

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }}
      />
      {faqLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      ) : null}

      <nav aria-label="breadcrumb" style={{ fontSize: 13, marginBottom: "0.75rem" }}>
        <Link className="muted" href={withLocale("/", locale)}>
          {t.breadcrumbHome}
        </Link>
        <span className="muted"> / </span>
        <Link className="muted" href={withLocale("/tools", locale)}>
          {t.navTools}
        </Link>
        {categoryLinks[0] ? (
          <>
            <span className="muted"> / </span>
            <Link
              className="muted"
              href={withLocale(`/categories/${categoryLinks[0].key}`, locale)}
            >
              {categoryLinks[0].name}
            </Link>
          </>
        ) : null}
        <span className="muted"> / </span>
        <span>{translation?.name ?? slug}</span>
      </nav>

      <div className="page-header" style={{ marginTop: "0.5rem", alignItems: "start" }}>
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
          <a
            className="btn btn-ghost"
            href={officialHref}
            rel="noopener noreferrer"
            target="_blank"
          >
            {t.officialSite}
          </a>
          <Link
            className="btn btn-ghost"
            href={withLocale(
              `/compare?tools=${slug}${similar[0] ? `,${similar[0].slug}` : ""}`,
              locale,
            )}
          >
            {t.navCompare}
          </Link>
        </div>
      </div>

      {categoryLinks.length > 0 || tags.length > 0 ? (
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
          {tags.map((tag) => (
            <span key={tag} className="pill">
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      <section style={{ marginTop: "1.5rem", maxWidth: "66ch" }}>
        <h2 style={{ fontSize: "1.15rem", letterSpacing: "-0.02em" }}>
          {t.overview}
        </h2>
        <p style={{ lineHeight: 1.7, fontSize: "1.05rem", color: "var(--text)" }}>
          {translation?.description}
        </p>
      </section>

      <div className="grid-2" style={{ marginTop: "1.75rem" }}>
        <Section title={t.features}>
          <ul style={{ margin: 0, paddingLeft: "1.1rem", lineHeight: 1.65 }}>
            {features.length === 0 ? (
              <li className="muted">—</li>
            ) : (
              features.map((f) => <li key={f}>{f}</li>)
            )}
          </ul>
        </Section>
        <Section title={`${t.pros} / ${t.cons}`}>
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
        </Section>
        <Section title={t.pricingPlan}>
          <p style={{ margin: 0, lineHeight: 1.65 }}>
            <strong>{tool.pricingModel}</strong>
            {tool.hasFreePlan ? ` · ${t.freePlan}` : null}
          </p>
          {translation?.pricingNotes ? (
            <p className="muted" style={{ marginTop: "0.65rem", lineHeight: 1.6 }}>
              {translation.pricingNotes}
            </p>
          ) : null}
        </Section>
        <Section title={t.languages}>
          <ul style={{ margin: 0, paddingLeft: "1.1rem", lineHeight: 1.65 }}>
            {languages.length === 0 ? (
              <li className="muted">—</li>
            ) : (
              languages.map((f) => <li key={f}>{f}</li>)
            )}
          </ul>
        </Section>
        <Section title={t.useCases}>
          <ul style={{ margin: 0, paddingLeft: "1.1rem", lineHeight: 1.65 }}>
            {useCases.length === 0 ? (
              <li className="muted">—</li>
            ) : (
              useCases.map((f) => <li key={f}>{f}</li>)
            )}
          </ul>
        </Section>
        <Section title={t.recommendedUsers}>
          <ul style={{ margin: 0, paddingLeft: "1.1rem", lineHeight: 1.65 }}>
            {recommendedUsers.length === 0 ? (
              <li className="muted">—</li>
            ) : (
              recommendedUsers.map((f) => <li key={f}>{f}</li>)
            )}
          </ul>
        </Section>
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

      {similar.length > 0 ? (
        <section style={{ marginTop: "2.25rem" }}>
          <h2 style={{ fontSize: "1.15rem", letterSpacing: "-0.02em" }}>
            {t.similarTools}
          </h2>
          <ul className="tools-grid" style={{ marginTop: "1rem" }}>
            {similar.map((other) => {
              const name = other.translations[0]?.name ?? other.slug;
              return (
                <li key={other.id} className="card-surface tool-card">
                  <Link
                    className="tool-card-link"
                    href={withLocale(`/tools/${other.slug}`, locale)}
                  >
                    <div className="tool-card-title">
                      <span className="tool-card-name">{name}</span>
                      <span className="pill">{other.pricingModel}</span>
                    </div>
                    <p className="tool-card-desc">
                      {other.translations[0]?.description?.slice(0, 120)}
                    </p>
                  </Link>
                  <div style={{ padding: "0 1rem 1rem", display: "flex", gap: "0.4rem" }}>
                    <Link
                      className="chip"
                      href={withLocale(`/compare?tools=${slug},${other.slug}`, locale)}
                    >
                      {t.vsPrefix}
                      {name}
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <div
        style={{
          marginTop: "2.5rem",
          display: "flex",
          gap: "0.65rem",
          flexWrap: "wrap",
        }}
      >
        <a
          className="btn btn-primary"
          href={ctaHref}
          rel="nofollow sponsored noopener"
          target="_blank"
        >
          {ctaLabel}
        </a>
        <a
          className="btn btn-ghost"
          href={officialHref}
          rel="noopener noreferrer"
          target="_blank"
        >
          {t.officialSite}
        </a>
      </div>
    </main>
  );
}
