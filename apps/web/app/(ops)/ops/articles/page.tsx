import { cookies } from "next/headers";
import { repos } from "@ai-base/database";
import { getDictionary, resolveLocale } from "@ai-base/i18n";
import { ArticlesAdminClient } from "./articles-admin-client";

export const dynamic = "force-dynamic";

export default async function AdminArticlesPage() {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get("locale")?.value);
  const dict = getDictionary(locale);
  const [articles, tools] = await Promise.all([
    repos.articles.listAll(200),
    repos.tools.findPublished(locale, { take: 120 }),
  ]);

  return (
    <main className="animate-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{dict.admin.articles}</h1>
          <p className="page-subtitle muted">{dict.admin.generateArticle}</p>
        </div>
      </div>
      <div style={{ marginTop: "1.25rem" }}>
        <ArticlesAdminClient
          locale={locale}
          toolSlugs={tools.map((t) => t.slug)}
          initialArticles={articles.map((a) => ({
            id: a.id,
            slug: a.slug,
            kind: a.kind,
            status: a.status,
            title:
              a.translations.find((t) => t.locale === locale)?.title ??
              a.translations[0]?.title ??
              a.slug,
          }))}
        />
      </div>
    </main>
  );
}
