import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary } from "@ai-base/i18n";
import { repos } from "@ai-base/database";
import { CompareFormClient } from "./compare-form";
import { orderBySlug, parseCompareSlugs } from "@/lib/compare";
import { resolvePublicLocale, withLocale } from "@/lib/site";
import { localeAlternatesFor } from "@/lib/seo";

export const revalidate = 60;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ locale?: string }>;
}): Promise<Metadata> {
  const locale = resolvePublicLocale((await searchParams).locale);
  const t = getDictionary(locale).public;
  return {
    title: `${t.compareTitle} | AI BASE`,
    description: t.compareDescription,
    alternates: localeAlternatesFor("/compare", locale),
  };
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ locale?: string; tools?: string }>;
}) {
  const sp = await searchParams;
  const locale = resolvePublicLocale(sp.locale);
  const t = getDictionary(locale).public;
  const slugs = parseCompareSlugs(sp.tools);

  const [catalog, selected, curated] = await Promise.all([
    repos.tools.findPublished(locale, { take: 100 }),
    slugs.length
      ? repos.tools.findPublishedBySlugs(slugs, locale)
      : Promise.resolve([]),
    repos.comparisons.findPublished(locale),
  ]);

  const ordered = orderBySlug(selected, slugs);

  return (
    <main className="container site-section animate-in">
      <div className="page-header">
        <div>
          <p className="page-kicker">{t.navCompare}</p>
          <h1 className="page-title">{t.compareTitle}</h1>
          <p className="page-subtitle">{t.compareSubtitle}</p>
        </div>
      </div>

      <div style={{ marginTop: "1.5rem", maxWidth: 560 }}>
        <CompareFormClient
          locale={locale}
          catalog={catalog.map((tool) => ({
            slug: tool.slug,
            name: tool.translations[0]?.name ?? tool.slug,
          }))}
          initial={slugs}
          label={t.compareSubmit}
        />
      </div>

      {ordered.length >= 2 ? (
        <section style={{ marginTop: "2rem" }}>
          <h2 style={{ fontSize: "1.15rem", letterSpacing: "-0.02em" }}>
            {t.compareTable}
          </h2>
          <div className="card-surface" style={{ overflowX: "auto", padding: "0.25rem" }}>
            <table className="compare-table">
              <thead>
                <tr>
                  <th>{t.compareField}</th>
                  {ordered.map((tool) => (
                    <th key={tool.id}>
                      <Link href={withLocale(`/tools/${tool.slug}`, locale)}>
                        {tool.translations[0]?.name ?? tool.slug}
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <CompareRows
                  tools={ordered}
                  labels={{
                    pricing: t.pricing,
                    freePlan: t.freePlan,
                    api: t.api,
                    summary: t.summary,
                    features: t.features,
                    pros: t.pros,
                    cons: t.cons,
                    cta: t.cta,
                    available: t.available,
                    unavailable: t.unavailable,
                    visitShort: t.visitShort,
                  }}
                />
              </tbody>
            </table>
          </div>
        </section>
      ) : slugs.length > 0 ? (
        <p className="muted" style={{ marginTop: "1rem" }}>
          {t.compareSelectMin}
        </p>
      ) : null}

      {curated.length > 0 ? (
        <section style={{ marginTop: "2.5rem" }}>
          <h2 style={{ fontSize: "1.15rem", letterSpacing: "-0.02em" }}>
            {t.compareCurated}
          </h2>
          <ul className="tools-grid">
            {curated.map((c) => {
              const tr = c.translations[0];
              return (
                <li key={c.id} className="card-surface tool-card">
                  <Link
                    href={withLocale(`/compare/${c.slug}`, locale)}
                    className="tool-card-link"
                  >
                    <span className="tool-card-name">{tr?.title ?? c.slug}</span>
                    <p className="tool-card-desc">{tr?.summary}</p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </main>
  );
}

function CompareRows({
  tools,
  labels,
}: {
  tools: Array<{
    slug: string;
    homepageUrl: string;
    pricingModel: string;
    hasFreePlan: boolean;
    hasApi: boolean;
    translations: Array<{
      description: string;
      features: unknown;
      pros: unknown;
      cons: unknown;
    }>;
    affiliateLinks: Array<{ id: string; label: string }>;
  }>;
  labels: {
    pricing: string;
    freePlan: string;
    api: string;
    summary: string;
    features: string;
    pros: string;
    cons: string;
    cta: string;
    available: string;
    unavailable: string;
    visitShort: string;
  };
}) {
  const yn = (v: boolean) => (v ? labels.available : labels.unavailable);
  const rows: Array<{ label: string; values: string[] }> = [
    {
      label: labels.pricing,
      values: tools.map((tool) => tool.pricingModel),
    },
    {
      label: labels.freePlan,
      values: tools.map((tool) => yn(tool.hasFreePlan)),
    },
    {
      label: labels.api,
      values: tools.map((tool) => yn(tool.hasApi)),
    },
    {
      label: labels.summary,
      values: tools.map(
        (tool) => tool.translations[0]?.description?.slice(0, 180) ?? "—",
      ),
    },
    {
      label: labels.features,
      values: tools.map((tool) => {
        const f = (tool.translations[0]?.features as string[]) ?? [];
        return f.slice(0, 5).join(", ") || "—";
      }),
    },
    {
      label: labels.pros,
      values: tools.map((tool) => {
        const f = (tool.translations[0]?.pros as string[]) ?? [];
        return f.slice(0, 4).join(", ") || "—";
      }),
    },
    {
      label: labels.cons,
      values: tools.map((tool) => {
        const f = (tool.translations[0]?.cons as string[]) ?? [];
        return f.slice(0, 4).join(", ") || "—";
      }),
    },
  ];

  return (
    <>
      {rows.map((row) => (
        <tr key={row.label}>
          <th>{row.label}</th>
          {row.values.map((v, i) => (
            <td key={`${row.label}-${i}`}>{v}</td>
          ))}
        </tr>
      ))}
      <tr>
        <th>{labels.cta}</th>
        {tools.map((tool) => {
          const aff = tool.affiliateLinks[0];
          const href = aff ? `/go/${aff.id}` : tool.homepageUrl;
          return (
            <td key={tool.slug}>
              <a
                className="btn btn-primary"
                href={href}
                rel="nofollow sponsored noopener"
                target="_blank"
                style={{ padding: "0.4rem 0.8rem" }}
              >
                {aff?.label || labels.visitShort}
              </a>
            </td>
          );
        })}
      </tr>
    </>
  );
}
