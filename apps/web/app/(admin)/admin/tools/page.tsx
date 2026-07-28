import { cookies } from "next/headers";
import { repos } from "@ai-base/database";
import { getDictionary, resolveLocale } from "@ai-base/i18n";
import { ToolsAdminClient } from "./tools-admin-client";

export const dynamic = "force-dynamic";

export default async function AdminToolsPage() {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get("locale")?.value);
  const dict = getDictionary(locale);
  const [tools, categories] = await Promise.all([
    repos.tools.listAll(300),
    repos.categories.list(locale),
  ]);

  return (
    <main className="animate-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{dict.admin.tools}</h1>
          <p className="page-subtitle muted">
            {dict.admin.addTool} / {dict.admin.editTool} / {dict.admin.deleteTool}
          </p>
        </div>
      </div>
      <div style={{ marginTop: "1.25rem" }}>
        <ToolsAdminClient
          locale={locale}
          initialTools={tools.map((t) => ({
            id: t.id,
            slug: t.slug,
            homepageUrl: t.homepageUrl,
            pricingModel: t.pricingModel,
            hasFreePlan: t.hasFreePlan,
            hasApi: t.hasApi,
            status: t.status,
            translations: t.translations.map((tr) => ({
              locale: tr.locale,
              name: tr.name,
              description: tr.description,
            })),
            categories: t.categories.map((c) => ({
              category: { key: c.category.key },
            })),
          }))}
          categories={categories.map((c) => ({
            key: c.key,
            name: c.translations[0]?.name ?? c.key,
          }))}
        />
      </div>
    </main>
  );
}
