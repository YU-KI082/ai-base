import type { Metadata } from "next";
import Link from "next/link";
import { repos } from "@ai-base/database";
import { ToolCard } from "@/components/tool-card";
import { absoluteUrl, resolvePublicLocale, withLocale } from "@/lib/site";

export const revalidate = 30;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ locale?: string; q?: string }>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const locale = resolvePublicLocale(sp.locale);
  const title = locale === "ja" ? "AIツール検索 | AI BASE" : "Search AI tools | AI BASE";
  return {
    title,
    description:
      locale === "ja"
        ? "名前や説明からAIツールを検索"
        : "Search AI tools by name or description",
    alternates: { canonical: absoluteUrl(withLocale("/search", locale)) },
  };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ locale?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const locale = resolvePublicLocale(sp.locale);
  const q = (sp.q ?? "").trim();
  const items = q
    ? await repos.tools.findPublished(locale, { q, take: 30 })
    : [];

  return (
    <main className="container site-section">
      <h1 style={{ fontFamily: "var(--font-display-loaded), serif", marginTop: 0 }}>
        {locale === "ja" ? "検索" : "Search"}
      </h1>
      <form action="/search" method="get" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {locale === "ja" ? <input type="hidden" name="locale" value="ja" /> : null}
        <input
          name="q"
          defaultValue={q}
          placeholder={locale === "ja" ? "ツール名やキーワード" : "Tool name or keyword"}
          style={{
            flex: "1 1 240px",
            background: "var(--bg)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "0.7rem 0.85rem",
          }}
        />
        <button className="btn btn-primary" type="submit">
          {locale === "ja" ? "検索" : "Search"}
        </button>
      </form>

      <ul style={{ listStyle: "none", padding: 0, marginTop: "1.5rem", display: "grid", gap: "0.75rem" }}>
        {!q ? (
          <li className="muted">
            {locale === "ja"
              ? "キーワードを入力して検索してください。"
              : "Enter a keyword to search published tools."}
          </li>
        ) : items.length === 0 ? (
          <li className="muted">
            {locale === "ja" ? "該当するツールがありません。" : "No matching tools."}{" "}
            <Link href={withLocale("/tools", locale)}>
              {locale === "ja" ? "一覧へ" : "Browse all"}
            </Link>
          </li>
        ) : (
          items.map((tool) => {
            const t = tool.translations[0];
            return (
              <ToolCard
                key={tool.id}
                locale={locale}
                slug={tool.slug}
                name={t?.name ?? tool.slug}
                description={t?.description}
                pricingModel={tool.pricingModel}
              />
            );
          })
        )}
      </ul>
    </main>
  );
}
