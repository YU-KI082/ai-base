"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { PublicLocale } from "@/lib/site";

const labels = {
  en: {
    tools: "Tools",
    categories: "Categories",
    compare: "Compare",
    search: "Search",
  },
  ja: {
    tools: "ツール",
    categories: "カテゴリ",
    compare: "比較",
    search: "検索",
  },
} as const;

function withLocalePath(path: string, locale: PublicLocale): string {
  const safe = path || "/";
  const [pathname, hash = ""] = safe.split("#");
  const [base, query = ""] = (pathname ?? "/").split("?");
  const params = new URLSearchParams(query);
  if (locale === "ja") params.set("locale", "ja");
  else params.delete("locale");
  const qs = params.toString();
  return `${base || "/"}${qs ? `?${qs}` : ""}${hash ? `#${hash}` : ""}`;
}

export function SiteHeader() {
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();
  const locale: PublicLocale = searchParams.get("locale") === "ja" ? "ja" : "en";
  const t = labels[locale];
  const current = `${pathname}${searchParams.toString() ? `?${searchParams}` : ""}`;
  const links = [
    { href: withLocalePath("/tools", locale), label: t.tools, match: "/tools" },
    {
      href: withLocalePath("/categories", locale),
      label: t.categories,
      match: "/categories",
    },
    {
      href: withLocalePath("/compare", locale),
      label: t.compare,
      match: "/compare",
    },
    { href: withLocalePath("/search", locale), label: t.search, match: "/search" },
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
          >
            {locale === "ja" ? "EN" : "JA"}
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter({ locale }: { locale: PublicLocale }) {
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
        {locale === "ja"
          ? "エージェントが継続評価し、人が承認して公開するAIツールメディア"
          : "AI tools continuously evaluated by agents, published with human approval"}
      </div>
    </footer>
  );
}
