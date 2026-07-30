import Link from "next/link";
import { cookies } from "next/headers";
import { getDictionary, resolveLocale } from "@ai-base/i18n";
import { UserAuthForm } from "../login/user-auth-form";

export default async function SignupPage() {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get("locale")?.value);
  const t = getDictionary(locale).os;

  return (
    <main className="os-auth-page">
      <div className="os-auth-hero">
        <p className="os-eyebrow">
          {t.brandName} {t.productName}
        </p>
        <h1>{t.signupTitle}</h1>
        <p className="os-lead">{t.signupLead}</p>
      </div>
      <UserAuthForm mode="signup" nextPath="/admin/setup" locale={locale} />
      <p className="os-auth-foot">
        <Link href="/login">Login</Link>
      </p>
    </main>
  );
}
