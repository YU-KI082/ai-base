import { Suspense } from "react";
import { cookies } from "next/headers";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { resolvePublicLocale } from "@/lib/site";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const locale = resolvePublicLocale(cookieStore.get("locale")?.value);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Suspense fallback={<div style={{ height: 57, borderBottom: "1px solid var(--border)" }} />}>
        <SiteHeader />
      </Suspense>
      <div style={{ flex: 1 }}>{children}</div>
      <SiteFooter locale={locale} />
    </div>
  );
}
