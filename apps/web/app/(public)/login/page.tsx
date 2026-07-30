import Link from "next/link";
import { cookies } from "next/headers";
import { getDictionary, resolveLocale } from "@ai-base/i18n";
import { UserAuthForm } from "./user-auth-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get("locale")?.value);
  const t = getDictionary(locale).os;
  const nextPath =
    sp.next && sp.next.startsWith("/admin") ? sp.next : "/admin";

  return (
    <main className="os-auth-page">
      <div className="os-auth-hero">
        <p className="os-eyebrow">
          {t.brandName} {t.productName}
        </p>
        <h1>{t.loginTitle}</h1>
        <p className="os-lead">{t.loginLead}</p>
      </div>
      <UserAuthForm mode="login" nextPath={nextPath} locale={locale} />
      <p className="os-auth-foot">
        <Link href="/">← Home</Link>
      </p>
    </main>
  );
}
