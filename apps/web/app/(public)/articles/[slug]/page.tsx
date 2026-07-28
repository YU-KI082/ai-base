import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { getDictionary } from "@ai-base/i18n";
import { repos } from "@ai-base/database";
import { cachedJson } from "@ai-base/cache";
import { absoluteUrl, resolvePublicLocale, withLocale } from "@/lib/site";
import {
  articleJsonLd,
  breadcrumbListJsonLd,
  localeAlternatesFor,
} from "@/lib/seo";
import { pickTranslation } from "@/lib/tool-detail";

export const revalidate = 60;

function renderBody(body: string) {
  const lines = body.split("\n");
  const nodes: ReactNode[] = [];
  let list: string[] = [];
  const flushList = (key: string) => {
    if (!list.length) return;
    nodes.push(
      <ul key={key} style={{ lineHeight: 1.7, paddingLeft: "1.2rem" }}>
        {list.map((item) => (
          <li key={item}>{linkify(item)}</li>
        ))}
      </ul>,
    );
    list = [];
  };

  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    if (line.startsWith("- ")) {
      list.push(line.slice(2));
      return;
    }
    flushList(`ul-${i}`);
    if (!line.trim()) return;
    if (line.startsWith("# ")) {
      nodes.push(
        <h1 key={i} className="page-title" style={{ fontSize: "1.85rem" }}>
          {line.slice(2)}
        </h1>,
      );
      return;
    }
    if (line.startsWith("## ")) {
      nodes.push(
        <h2 key={i} style={{ fontSize: "1.2rem", marginTop: "1.5rem" }}>
          {line.slice(3)}
        </h2>,
      );
      return;
    }
    nodes.push(
      <p key={i} style={{ lineHeight: 1.75, margin: "0.65rem 0" }}>
        {linkify(line)}
      </p>,
    );
  });
  flushList("ul-end");
  return nodes;
}

function linkify(text: string): ReactNode {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    const m = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (!m) return <span key={i}>{part}</span>;
    const href = m[2]!;
    const label = m[1]!;
    if (href.startsWith("/")) {
      return (
        <Link key={i} href={href}>
          {label}
        </Link>
      );
    }
    return (
      <a key={i} href={href} rel="noopener noreferrer" target="_blank">
        {label}
      </a>
    );
  });
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ locale?: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const locale = resolvePublicLocale((await searchParams).locale);
  const article = await cachedJson(`page:article:${slug}`, 60, () =>
    repos.articles.findBySlug(slug),
  );
  const t = getDictionary(locale).public;
  if (!article || article.status !== "published") {
    return { title: `${t.notFound} | AI BASE` };
  }
  const tr = pickTranslation(article.translations, locale);
  const title = tr?.seoTitle || `${tr?.title ?? slug} | AI BASE`;
  const description = tr?.seoDescription || tr?.summary?.slice(0, 155);
  const url = absoluteUrl(withLocale(`/articles/${slug}`, locale));
  return {
    title,
    description,
    alternates: localeAlternatesFor(`/articles/${slug}`, locale),
    openGraph: {
      title,
      description: description ?? undefined,
      url,
      siteName: "AI BASE",
      type: "article",
      locale: locale === "ja" ? "ja_JP" : "en_US",
    },
    twitter: { card: "summary_large_image", title, description: description ?? undefined },
  };
}

export default async function ArticleDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ locale?: string }>;
}) {
  const { slug } = await params;
  const locale = resolvePublicLocale((await searchParams).locale);
  const t = getDictionary(locale).public;
  const article = await cachedJson(`page:article:${slug}`, 60, () =>
    repos.articles.findBySlug(slug),
  );
  if (!article || article.status !== "published") notFound();
  const tr = pickTranslation(article.translations, locale);
  const pageUrl = absoluteUrl(withLocale(`/articles/${slug}`, locale));
  const crumbs = breadcrumbListJsonLd([
    { name: t.breadcrumbHome, url: absoluteUrl(withLocale("/", locale)) },
    {
      name: t.navArticles,
      url: absoluteUrl(withLocale("/articles", locale)),
    },
    { name: tr?.title ?? slug, url: pageUrl },
  ]);
  const ld = articleJsonLd({
    title: tr?.title ?? slug,
    description: tr?.summary,
    url: pageUrl,
    datePublished: article.publishedAt,
  });

  return (
    <main className="container site-section animate-in">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
      />
      <nav aria-label="breadcrumb" style={{ fontSize: 13, marginBottom: "0.75rem" }}>
        <Link className="muted" href={withLocale("/", locale)}>
          {t.breadcrumbHome}
        </Link>
        <span className="muted"> / </span>
        <Link className="muted" href={withLocale("/articles", locale)}>
          {t.navArticles}
        </Link>
        <span className="muted"> / </span>
        <span>{tr?.title ?? slug}</span>
      </nav>

      <article style={{ maxWidth: "68ch" }}>
        <p className="page-kicker">{article.kind}</p>
        <div style={{ display: "grid", gap: "0.35rem" }}>{renderBody(tr?.body ?? "")}</div>
      </article>

      <div style={{ marginTop: "2rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <Link className="btn btn-primary" href={withLocale("/tools", locale)}>
          {t.navTools}
        </Link>
        <Link className="btn btn-ghost" href={withLocale("/articles", locale)}>
          {t.navArticles}
        </Link>
      </div>
    </main>
  );
}
