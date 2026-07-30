import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser, USER_SESSION_COOKIE } from "@ai-base/auth";
import { OsLogoutButton } from "./os-logout-button";

const NAV = [
  { href: "/admin", label: "AI社員" },
  { href: "/admin/tasks", label: "タスク" },
  { href: "/admin/posts", label: "投稿" },
  { href: "/admin/score", label: "SCORE" },
  { href: "/admin/dash", label: "概要" },
] as const;

export default async function OsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
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

  return (
    <div className="os-shell">
      <header className="os-topbar">
        <Link href={setupDone ? "/admin" : "/admin/setup"} className="os-brand">
          AI BASE <span>OS</span>
        </Link>
        <div className="os-topbar-actions">
          <Link href="/admin/brand" className="os-ghost-btn">
            ブランド
          </Link>
          <OsLogoutButton />
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
