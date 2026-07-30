"use client";

import { getDictionary, type Locale } from "@ai-base/i18n";

export function LocaleSwitcher({ current }: { current: Locale }) {
  const t = getDictionary(current).public;

  async function setLocale(locale: Locale) {
    document.cookie = `locale=${locale}; path=/; max-age=31536000; samesite=lax`;
    window.location.reload();
  }

  return (
    <div style={{ display: "flex", gap: "0.4rem" }}>
      <button
        className="btn btn-ghost"
        style={{ opacity: current === "ja" ? 1 : 0.55, padding: "0.35rem 0.6rem" }}
        onClick={() => void setLocale("ja")}
        type="button"
      >
        {t.switchToJa}
      </button>
      <button
        className="btn btn-ghost"
        style={{ opacity: current === "en" ? 1 : 0.55, padding: "0.35rem 0.6rem" }}
        onClick={() => void setLocale("en")}
        type="button"
      >
        {t.switchToEn}
      </button>
    </div>
  );
}
