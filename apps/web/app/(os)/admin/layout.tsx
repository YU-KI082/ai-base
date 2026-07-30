import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser, USER_SESSION_COOKIE } from "@ai-base/auth";
import { getDictionary, resolveLocale } from "@ai-base/i18n";
import { OsLogoutButton } from "./os-logout-button";

export default async function OsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get("locale")?.value);
  const t = getDictionary(locale).os;
  const session = cookieStore.get(USER_SESSION_COOKIE)?.value;
  if (!session) redirect("/login?next=/admin");

  let setupDone = false;
  try {
    const ctx = await requireUser(
      new Request("http://localhost/admin", {
        headers: { cookie: `${USER_SESSION_COOKIE}=${session}` },
      }),
    );
    setupDone = ctx.setupDone;
  } catch {
    redirect("/login?next=/admin");
  }

  const NAV = [
    { href: "/admin", label: t.navAssistant },
    { href: "/admin/tasks", label: t.navTasks },
    { href: "/admin/posts", label: t.navPosts },
    { href: "/admin/score", label: t.navScore },
    { href: "/admin/dash", label: t.navDash },
  ] as const;

  return (
    <div className="os-shell">
      <header className="os-topbar">
        <Link href={setupDone ? "/admin" : "/admin/setup"} className="os-brand">
          {t.brandName} <span>{t.productName}</span>
        </Link>
        <div className="os-topbar-actions">
          <Link href="/admin/brand" className="os-ghost-btn">
            {t.navBrand}
          </Link>
          <OsLogoutButton label={t.logout} />
        </div>
      </header>
      <div className="os-body">{children}</div>
      {setupDone ? (
        <nav className="os-tabbar" aria-label="OS navigation">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="os-tab">
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </div>
  );
}
