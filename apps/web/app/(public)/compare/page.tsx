import type { Metadata } from "next";
import Link from "next/link";
import { repos } from "@ai-base/database";
import { CompareFormClient } from "./compare-form";
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
  const slugs = (sp.tools ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);

  const [catalog, selected, curated] = await Promise.all([
    repos.tools.findPublished(locale, { take: 100 }),
    slugs.length
      ? repos.tools.findPublishedBySlugs(slugs, locale)
      : Promise.resolve([]),
    repos.comparisons.findPublished(locale),
  ]);

  const ordered = slugs
    .map((slug) => selected.find((t) => t.slug === slug))
    .filter(Boolean) as typeof selected;

  const copy =
    locale === "ja"
      ? {
          title: "比較",
          run: "比較する",
          curated: "公開中の比較記事",
          empty: "ツールを2つ以上選んでください。",
          vs: "比較表",
        }
      : {
          title: "Compare",
          run: "Compare",
          curated: "Published comparisons",
          empty: "Select at least two tools.",
          vs: "Comparison",
        };

  return (
    <main className="container site-section">
      <h1 style={{ fontFamily: "var(--font-display-loaded), serif", marginTop: 0 }}>
        {copy.title}
      </h1>

      <CompareFormClient
        locale={locale}
        catalog={catalog.map((t) => ({
          slug: t.slug,
          name: t.translations[0]?.name ?? t.slug,
        }))}
        initial={slugs}
        label={copy.run}
      />

      {ordered.length >= 2 ? (
        <section style={{ marginTop: "2rem" }}>
          <h2>{copy.vs}</h2>
          <div style={{ overflowX: "auto" }}>
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
          <h2>{copy.curated}</h2>
          <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "0.65rem" }}>
            {curated.map((c) => {
              const tr = c.translations[0];
              return (
                <li key={c.id} className="card-surface" style={{ padding: "1rem 1.15rem" }}>
                  <Link href={withLocale(`/compare/${c.slug}`, locale)}>
                    <strong>{tr?.title ?? c.slug}</strong>
                    <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                      {tr?.summary}
                    </p>
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
                style={{ padding: "0.35rem 0.7rem" }}
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
