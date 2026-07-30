import { cookies } from "next/headers";
import Link from "next/link";
import { getDictionary, resolveLocale } from "@ai-base/i18n";
import {
  SITE_BRAND_PACKS,
  buildRevenueDashboard,
  loadCompanyOpsSettings,
} from "@ai-base/company-ops";
import { CompanyDashboardClient } from "./company-dashboard-client";

export const dynamic = "force-dynamic";

export default async function CompanyAdminPage() {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get("locale")?.value);
  const dict = getDictionary(locale);
  const [settings, revenue] = await Promise.all([
    loadCompanyOpsSettings(),
    buildRevenueDashboard(),
  ]);

  return (
    <main className="animate-in">
      <div className="page-header">
        <div>
          <p className="page-kicker">{dict.admin.ops}</p>
          <h1 className="page-title">
            {locale === "ja" ? "AI会社ダッシュボード" : "AI Company Dashboard"}
          </h1>
          <p className="page-subtitle">
            {locale === "ja"
              ? "収集→記事→SEO→動画→SNS→分析→改善→収益最大化の自動ループ"
              : "Research → articles → SEO → video → SNS → analytics → improve → revenue"}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <Link className="btn btn-ghost" href="/ops/ops">
            Ops
          </Link>
          <Link className="btn btn-ghost" href="/ops/social">
            Social
          </Link>
          <Link className="btn btn-ghost" href="/ops/agents">
            Agents
          </Link>
        </div>
      </div>
      <CompanyDashboardClient
        locale={locale === "en" ? "en" : "ja"}
        settings={settings}
        revenue={revenue}
        brands={SITE_BRAND_PACKS}
      />
    </main>
  );
}
