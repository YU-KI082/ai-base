"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { getDictionary, type Locale } from "@ai-base/i18n";
import type { PublicLocale } from "@/lib/site";

function withLocalePath(path: string, locale: PublicLocale): string {
  const safe = path || "/";
  const [pathname, hash = ""] = safe.split("#");
  const [base, query = ""] = (pathname ?? "/").split("?");
  const params = new URLSearchParams(query);
  if (locale === "en") params.set("locale", "en");
  else params.delete("locale");
  const qs = params.toString();
  return `${base || "/"}${qs ? `?${qs}` : ""}${hash ? `#${hash}` : ""}`;
}

function resolveChromeLocale(searchParams: URLSearchParams): PublicLocale {
  return searchParams.get("locale") === "en" ? "en" : "ja";
}

function persistLocaleCookie(locale: Locale) {
  document.cookie = `locale=${locale}; path=/; max-age=31536000; samesite=lax`;
}

export function SiteHeader() {
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();
  const locale = resolveChromeLocale(searchParams);
  const t = getDictionary(locale).public;
  const current = `${pathname}${searchParams.toString() ? `?${searchParams}` : ""}`;
  const links = [
    { href: withLocalePath("/tools", locale), label: t.navTools, match: "/tools" },
    {
      href: withLocalePath("/categories", locale),
      label: t.navCategories,
      match: "/categories",
    },
    {
      href: withLocalePath("/articles", locale),
      label: t.navArticles,
      match: "/articles",
    },
    {
      href: withLocalePath("/compare", locale),
      label: t.navCompare,
      match: "/compare",
    },
    { href: withLocalePath("/search", locale), label: t.navSearch, match: "/search" },
  ];

  return (
    <header
      style={{
        borderBottom: "1px solid var(--border)",
        background: "color-mix(in srgb, var(--bg) 86%, transparent)",
        backdropFilter: "saturate(140%) blur(12px)",
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}
    >
      <div
        className="container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          padding: "0.9rem 0",
        }}
      >
        <Link
          href={withLocalePath("/", locale)}
          style={{
            fontFamily: "var(--font-display-loaded), var(--font-display)",
            fontSize: "1.25rem",
            letterSpacing: "-0.03em",
            fontWeight: 550,
          }}
        >
          AI BASE
        </Link>
        <nav
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.25rem",
            alignItems: "center",
          }}
        >
          {links.map((link) => {
            const active =
              pathname === link.match || pathname.startsWith(`${link.match}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`chip ${active ? "chip-active" : ""}`}
                style={{ padding: "0.4rem 0.75rem" }}
              >
                {link.label}
              </Link>
            );
          })}
          <Link
            className="chip"
            href={withLocalePath(current, locale === "ja" ? "en" : "ja")}
            style={{ padding: "0.4rem 0.75rem" }}
            onClick={() => persistLocaleCookie(locale === "ja" ? "en" : "ja")}
          >
            {locale === "ja" ? t.switchToEn : t.switchToJa}
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter({ locale }: { locale: PublicLocale }) {
  const t = getDictionary(locale).public;
  return (
    <footer
      style={{
        borderTop: "1px solid var(--border)",
        marginTop: "auto",
        padding: "1.75rem 0 2.5rem",
      }}
    >
      <div className="container muted" style={{ fontSize: 13, lineHeight: 1.5 }}>
        <strong style={{ color: "var(--text)" }}>AI BASE</strong>
        {" — "}
        {t.footerTagline}
      </div>
    </footer>
  );
}
