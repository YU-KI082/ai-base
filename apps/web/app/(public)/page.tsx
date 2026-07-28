import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary } from "@ai-base/i18n";
import { absoluteUrl, resolvePublicLocale, withLocale } from "@/lib/site";
import { localeAlternatesFor } from "@/lib/seo";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ locale?: string }>;
}): Promise<Metadata> {
  const locale = resolvePublicLocale((await searchParams).locale);
  const t = getDictionary(locale).public;
  return {
    title: "AI BASE",
    description: t.homeDescription,
    alternates: localeAlternatesFor("/", locale),
    openGraph: {
      title: "AI BASE",
      description: t.homeDescription,
      url: absoluteUrl(withLocale("/", locale)),
      siteName: "AI BASE",
    },
  };
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ locale?: string }>;
}) {
  const locale = resolvePublicLocale((await searchParams).locale);
  const t = getDictionary(locale).public;

  return (
    <main>
      <section
        className="animate-in"
        style={{
          minHeight: "calc(100vh - 64px)",
          display: "grid",
          placeItems: "center",
          padding: "2rem",
          background:
            "radial-gradient(900px 480px at 12% -10%, rgba(17,17,16,0.06), transparent 55%), radial-gradient(700px 420px at 100% 0%, rgba(17,17,16,0.04), transparent 50%)",
        }}
      >
        <div className="container" style={{ textAlign: "left", maxWidth: 720 }}>
          <p className="page-kicker">{t.homeEyebrow}</p>
          <h1
            style={{
              fontFamily: "var(--font-display-loaded), var(--font-display)",
              fontSize: "clamp(3.2rem, 9vw, 5.6rem)",
              lineHeight: 0.92,
              margin: "0.35rem 0 1rem",
              letterSpacing: "-0.045em",
              fontWeight: 550,
            }}
          >
            AI BASE
          </h1>
          <p style={{ fontSize: "1.12rem", maxWidth: "34ch", color: "var(--text-muted)", lineHeight: 1.55 }}>
            {t.homeSupport}
          </p>
          <div style={{ display: "flex", gap: "0.65rem", marginTop: "1.75rem", flexWrap: "wrap" }}>
            <Link className="btn btn-primary" href={withLocale("/tools", locale)}>
              {t.browseTools}
            </Link>
            <Link className="btn btn-ghost" href={withLocale("/search", locale)}>
              {t.searchCta}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
