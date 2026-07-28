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

  const copy =
    locale === "ja"
      ? {
          kicker: "検索",
          title: "AIツールを探す",
          subtitle: "名前や説明文から公開ツールを検索します。",
          placeholder: "例: chatgpt, image, productivity",
          submit: "検索",
          hint: "キーワードを入力して検索してください。",
          empty: "該当するツールがありません。",
          browse: "一覧へ",
        }
      : {
          kicker: "Search",
          title: "Find AI tools",
          subtitle: "Search published tools by name or description.",
          placeholder: "e.g. chatgpt, image, productivity",
          submit: "Search",
          hint: "Enter a keyword to search published tools.",
          empty: "No matching tools.",
          browse: "Browse all",
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

      <form
        action="/search"
        method="get"
        className="card-surface"
        style={{
          marginTop: "1.5rem",
          padding: "0.85rem",
          display: "flex",
          gap: "0.5rem",
          flexWrap: "wrap",
          alignItems: "center",
          maxWidth: 720,
        }}
      >
        {locale === "ja" ? <input type="hidden" name="locale" value="ja" /> : null}
        <input
          name="q"
          defaultValue={q}
          placeholder={copy.placeholder}
          aria-label={copy.submit}
          style={{
            flex: "1 1 240px",
            background: "var(--bg)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            borderRadius: 999,
            padding: "0.75rem 1rem",
          }}
        />
        <button className="btn btn-primary" type="submit">
          {copy.submit}
        </button>
      </form>

      {!q ? (
        <p className="muted" style={{ marginTop: "1.25rem" }}>
          {copy.hint}
        </p>
      ) : items.length === 0 ? (
        <div className="empty-state" style={{ marginTop: "1.25rem" }}>
          {copy.empty}{" "}
          <Link href={withLocale("/tools", locale)}>{copy.browse}</Link>
        </div>
      ) : (
        <ul className="tools-grid">
          {items.map((tool) => {
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
          })}
        </ul>
      )}
    </main>
  );
}
