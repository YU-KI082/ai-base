import Link from "next/link";
import { cookies } from "next/headers";
import { getDictionary, resolveLocale } from "@ai-base/i18n";
import { LoginForm } from "./login-form";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get("locale")?.value);
  const t = getDictionary(locale).public;
  const a = getDictionary(locale).admin;
  const nextPath =
    sp.next && sp.next.startsWith("/admin") ? sp.next : "/admin";

  return (
    <main className="container" style={{ padding: "4rem 0", maxWidth: 560 }}>
      <h1 style={{ fontFamily: "var(--font-display-loaded), serif" }}>{t.adminSignIn}</h1>
      <p className="muted">{t.adminSignInBody}</p>
      <div style={{ marginTop: "1.25rem" }}>
        <LoginForm
          nextPath={nextPath}
          labels={{
            secret: a.opsSecret,
            submit: a.signIn,
            error: getDictionary(locale).common.error,
          }}
        />
      </div>
      <p className="muted" style={{ marginTop: "1.25rem", fontSize: 14 }}>
        {t.adminSignInDevHint}
      </p>
      <p>
        <Link href="/">{t.backHome}</Link>
      </p>
    </main>
  );
}
