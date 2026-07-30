import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser, USER_SESSION_COOKIE } from "@ai-base/auth";
import { getDictionary, resolveLocale } from "@ai-base/i18n";
import { OsTabbar } from "./os-tabbar";

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
    { href: "/admin", label: t.navHome },
    { href: "/admin/analysis", label: t.navAnalysis },
    { href: "/admin/create", label: t.navCreate },
    { href: "/admin/brand", label: t.navBrand },
    { href: "/admin/account", label: t.navAccount },
  ] as const;

  return (
    <div className="os-shell">
      <header className="os-topbar">
        <Link href={setupDone ? "/admin" : "/admin/setup"} className="os-brand">
          {t.brandName} <span>{t.productName}</span>
        </Link>
        <div className="os-topbar-actions">
          <span className="os-muted" style={{ fontSize: "0.8rem" }}>
            {t.employee}
          </span>
        </div>
      </header>
      <div className="os-body">{children}</div>
      {setupDone ? <OsTabbar items={NAV} /> : null}
    </div>
  );
}
