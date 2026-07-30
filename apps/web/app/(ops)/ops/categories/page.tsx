import { cookies } from "next/headers";
import { repos } from "@ai-base/database";
import { getDictionary, resolveLocale } from "@ai-base/i18n";
import { CategoriesAdminClient } from "./categories-admin-client";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get("locale")?.value);
  const dict = getDictionary(locale);
  const categories = await repos.categories.list(locale);

  return (
    <main className="animate-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{dict.admin.categories}</h1>
        </div>
      </div>
      <div style={{ marginTop: "1.25rem" }}>
        <CategoriesAdminClient
          locale={locale}
          initialCategories={categories.map((c) => ({
            key: c.key,
            name: c.translations[0]?.name ?? c.key,
            sortOrder: c.sortOrder,
          }))}
        />
      </div>
    </main>
  );
}
