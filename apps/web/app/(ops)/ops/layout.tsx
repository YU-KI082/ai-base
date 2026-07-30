import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  isAdminDevBypassEnabled,
  isProductionRuntime,
  requireAdmin,
  SESSION_COOKIE,
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
    const session = cookieStore.get(SESSION_COOKIE)?.value;
    if (isProductionRuntime() && !session) {
      redirect("/ops/login");
    }
    if (!isProductionRuntime() && !isAdminDevBypassEnabled() && !session) {
      redirect("/ops/login");
    }
    const cookieHeader = session ? `${SESSION_COOKIE}=${session}` : "";
    await requireAdmin(
      new Request("http://localhost/ops", {
        headers: cookieHeader ? { cookie: cookieHeader } : {},
      }),
    );
  } catch {
    redirect("/ops/login");
  }

  const links: Array<{ href: string; label: string }> = [
    { href: "/ops/ops", label: dict.admin.opsDashboard },
    { href: "/ops/self-healing", label: dict.admin.selfHealing },
    { href: "/ops", label: dict.admin.dashboard },
    { href: "/ops/drafts", label: dict.admin.drafts },
    { href: "/ops/ingest", label: dict.admin.ingest },
    { href: "/ops/tools", label: dict.admin.tools },
    { href: "/ops/articles", label: dict.admin.articles },
    { href: "/ops/categories", label: dict.admin.categories },
    { href: "/ops/affiliate", label: dict.admin.affiliate },
    { href: "/ops/social", label: dict.admin.social },
    { href: "/ops/sns", label: dict.admin.snsLearning },
    { href: "/ops/agents", label: dict.admin.agents },
    { href: "/ops/workflows", label: dict.admin.workflows },
    { href: "/ops/marketplace", label: dict.admin.marketplace },
    { href: "/ops/logs", label: dict.admin.logs },
    { href: "/ops/settings", label: dict.admin.settings },
  ];

  return (
    <div className="admin-shell">
      <aside className="admin-aside">
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
          {dict.admin.adminLabel}
        </p>
        <nav className="admin-nav">
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
              ← {dict.admin.publicSite}
            </Link>
          </p>
        </div>
      </aside>
      <div className="admin-main">{children}</div>
    </div>
  );
}
