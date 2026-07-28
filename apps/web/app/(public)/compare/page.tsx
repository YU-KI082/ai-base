import type { Metadata } from "next";
import Link from "next/link";
import { repos } from "@ai-base/database";
import { CompareFormClient } from "./compare-form";
import { orderBySlug, parseCompareSlugs } from "@/lib/compare";
import { absoluteUrl, resolvePublicLocale, withLocale } from "@/lib/site";

export const revalidate = 60;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ locale?: string }>;
}): Promise<Metadata> {
  const locale = resolvePublicLocale((await searchParams).locale);
  const title = locale === "ja" ? "AIツール比較 | AI BASE" : "Compare AI tools | AI BASE";
  return {
    title,
    description:
      locale === "ja"
        ? "2〜3のAIツールを並べて比較"
        : "Compare two or three AI tools side by side",
    alternates: { canonical: absoluteUrl(withLocale("/compare", locale)) },
  };
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ locale?: string; tools?: string }>;
}) {
  const sp = await searchParams;
  const locale = resolvePublicLocale(sp.locale);
  const slugs = parseCompareSlugs(sp.tools);

  const [catalog, selected, curated] = await Promise.all([
    repos.tools.findPublished(locale, { take: 100 }),
    slugs.length
      ? repos.tools.findPublishedBySlugs(slugs, locale)
      : Promise.resolve([]),
    repos.comparisons.findPublished(locale),
  ]);

  const ordered = orderBySlug(selected, slugs);

  const copy =
    locale === "ja"
      ? {
          kicker: "比較",
          title: "AIツール比較",
          subtitle: "料金・機能・長所短所を横並びで確認できます。",
          run: "比較する",
          curated: "公開中の比較記事",
          empty: "ツールを2つ以上選んでください。",
          vs: "比較表",
        }
      : {
          kicker: "Compare",
          title: "Compare AI tools",
          subtitle: "See pricing, features, and tradeoffs side by side.",
          run: "Compare",
          curated: "Published comparisons",
          empty: "Select at least two tools.",
          vs: "Comparison table",
        };

  return (
    <main className="container site-section animate-in">
      <div className="page-header">
        <div>
          <p className="page-kicker">{copy.kicker}</p>
          <h1 className="page-title">{copy.title}</h1>
          <p className="page-subtitle">{copy.subtitle}</p>
        </div>
      </div>

      <div style={{ marginTop: "1.5rem", maxWidth: 560 }}>
        <CompareFormClient
          locale={locale}
          catalog={catalog.map((t) => ({
            slug: t.slug,
            name: t.translations[0]?.name ?? t.slug,
          }))}
          initial={slugs}
          label={copy.run}
        />
      </div>

      {ordered.length >= 2 ? (
        <section style={{ marginTop: "2rem" }}>
          <h2 style={{ fontSize: "1.15rem", letterSpacing: "-0.02em" }}>{copy.vs}</h2>
          <div className="card-surface" style={{ overflowX: "auto", padding: "0.25rem" }}>
            <table className="compare-table">
              <thead>
                <tr>
                  <th>{locale === "ja" ? "項目" : "Field"}</th>
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
                <CompareRows locale={locale} tools={ordered} />
              </tbody>
            </table>
          </div>
        </section>
      ) : slugs.length > 0 ? (
        <p className="muted" style={{ marginTop: "1rem" }}>
          {copy.empty}
        </p>
      ) : null}

      {curated.length > 0 ? (
        <section style={{ marginTop: "2.5rem" }}>
          <h2 style={{ fontSize: "1.15rem", letterSpacing: "-0.02em" }}>
            {copy.curated}
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
  locale,
  tools,
}: {
  locale: "en" | "ja";
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
}) {
  const rows: Array<{ label: string; values: string[] }> = [
    {
      label: locale === "ja" ? "料金" : "Pricing",
      values: tools.map((t) => t.pricingModel),
    },
    {
      label: locale === "ja" ? "無料プラン" : "Free plan",
      values: tools.map((t) =>
        t.hasFreePlan ? (locale === "ja" ? "あり" : "Yes") : locale === "ja" ? "なし" : "No",
      ),
    },
    {
      label: "API",
      values: tools.map((t) =>
        t.hasApi ? (locale === "ja" ? "あり" : "Yes") : locale === "ja" ? "なし" : "No",
      ),
    },
    {
      label: locale === "ja" ? "概要" : "Summary",
      values: tools.map((t) => t.translations[0]?.description?.slice(0, 180) ?? "—"),
    },
    {
      label: locale === "ja" ? "主な機能" : "Features",
      values: tools.map((t) => {
        const f = (t.translations[0]?.features as string[]) ?? [];
        return f.slice(0, 5).join(", ") || "—";
      }),
    },
    {
      label: locale === "ja" ? "長所" : "Pros",
      values: tools.map((t) => {
        const f = (t.translations[0]?.pros as string[]) ?? [];
        return f.slice(0, 4).join(", ") || "—";
      }),
    },
    {
      label: locale === "ja" ? "短所" : "Cons",
      values: tools.map((t) => {
        const f = (t.translations[0]?.cons as string[]) ?? [];
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
        <th>CTA</th>
        {tools.map((t) => {
          const aff = t.affiliateLinks[0];
          const href = aff ? `/go/${aff.id}` : t.homepageUrl;
          return (
            <td key={t.slug}>
              <a
                className="btn btn-primary"
                href={href}
                rel="nofollow sponsored noopener"
                target="_blank"
                style={{ padding: "0.4rem 0.8rem" }}
              >
                {aff?.label || (locale === "ja" ? "公式へ" : "Visit")}
              </a>
            </td>
          );
        })}
      </tr>
    </>
  );
}
