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
    { href: "/admin/ingest", label: "Ingest" },
    { href: "/admin/tools", label: dict.admin.tools },
    { href: "/admin/affiliate", label: "Affiliate Intel" },
    { href: "/admin/social", label: "Social" },
    { href: "/admin/sns", label: "SNS Learning" },
    { href: "/admin/agents", label: dict.admin.agents },
    { href: "/admin/workflows", label: dict.admin.workflows },
    { href: "/admin/marketplace", label: "Marketplace" },
    { href: "/admin/logs", label: dict.admin.logs },
    { href: "/admin/settings", label: dict.admin.settings },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "240px 1fr",
        minHeight: "100vh",
        background: "var(--bg)",
      }}
    >
      <aside
        style={{
          borderRight: "1px solid var(--border)",
          background: "var(--bg-elevated)",
          padding: "1.35rem 1rem",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-display-loaded), var(--font-display)",
            fontSize: "1.3rem",
            letterSpacing: "-0.03em",
            padding: "0 0.4rem",
          }}
        >
          {dict.common.appName}
        </div>
        <p className="muted" style={{ fontSize: 12, margin: "0.25rem 0 0", padding: "0 0.4rem" }}>
          Admin
        </p>
        <nav style={{ display: "grid", gap: "0.2rem", marginTop: "1.5rem" }}>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="chip"
              style={{
                justifyContent: "flex-start",
                borderRadius: 10,
                borderColor: "transparent",
                background: "transparent",
                padding: "0.55rem 0.7rem",
              }}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div style={{ marginTop: "2rem", padding: "0 0.4rem" }}>
          <LocaleSwitcher current={locale} />
          <p style={{ marginTop: "1rem" }}>
            <Link href="/" className="muted" style={{ fontSize: 13 }}>
              ← Public site
            </Link>
          </p>
        </div>
      </aside>
      <div style={{ padding: "1.75rem 1.75rem 2.5rem" }}>{children}</div>
    </div>
  );
}
