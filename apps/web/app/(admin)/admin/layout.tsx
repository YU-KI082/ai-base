import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  isAdminDevBypassEnabled,
  isProductionRuntime,
  requireAdmin,
} from "@ai-base/auth";
import { getDictionary, resolveLocale } from "@ai-base/i18n";
import { LocaleSwitcher } from "./locale-switcher";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get("locale")?.value);
  const dict = getDictionary(locale);

  // Defense in depth beyond middleware (RSC data gate).
  try {
    if (isProductionRuntime() && !cookieStore.get("aibase_session")?.value) {
      redirect("/login");
    }
    if (!isProductionRuntime() && !isAdminDevBypassEnabled()) {
      redirect("/login");
    }
    await requireAdmin();
  } catch {
    redirect("/login");
  }

  const links: Array<{ href: string; label: string }> = [
    { href: "/admin", label: dict.admin.dashboard },
    { href: "/admin/drafts", label: dict.admin.drafts },
    { href: "/admin/agents", label: dict.admin.agents },
    { href: "/admin/marketplace", label: "Marketplace" },
    { href: "/admin/workflows", label: dict.admin.workflows },
    { href: "/admin/tools", label: dict.admin.tools },
    { href: "/admin/affiliate", label: "Affiliate" },
    { href: "/admin/social", label: "Social" },
    { href: "/admin/logs", label: dict.admin.logs },
    { href: "/admin/settings", label: dict.admin.settings },
    { href: "/admin/ingest", label: "Ingest" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", minHeight: "100vh" }}>
      <aside
        style={{
          borderRight: "1px solid var(--border)",
          background: "var(--bg-soft)",
          padding: "1.25rem",
        }}
      >
        <div style={{ fontFamily: "var(--font-display-loaded), serif", fontSize: "1.4rem" }}>
          {dict.common.appName}
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>Admin</p>
        <nav style={{ display: "grid", gap: "0.35rem", marginTop: "1.5rem" }}>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                padding: "0.55rem 0.7rem",
                borderRadius: 10,
              }}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div style={{ marginTop: "2rem" }}>
          <LocaleSwitcher current={locale} />
        </div>
      </aside>
      <div style={{ padding: "1.5rem" }}>{children}</div>
    </div>
  );
}
