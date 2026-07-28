"use client";

import type { Locale } from "@ai-base/i18n";

export function LocaleSwitcher({ current }: { current: Locale }) {
  async function setLocale(locale: Locale) {
    document.cookie = `locale=${locale}; path=/; max-age=31536000`;
    window.location.reload();
  }

  return (
    <div style={{ display: "flex", gap: "0.4rem" }}>
      {(["en", "ja"] as Locale[]).map((locale) => (
        <button
          key={locale}
          className="btn btn-ghost"
          style={{ opacity: locale === current ? 1 : 0.55, padding: "0.35rem 0.6rem" }}
          onClick={() => void setLocale(locale)}
        >
          {locale.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
