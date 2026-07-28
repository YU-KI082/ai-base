import { type Locale } from "@ai-base/i18n";

export function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

export function absoluteUrl(path: string): string {
  const base = siteUrl();
  if (!path.startsWith("/")) return `${base}/${path}`;
  return `${base}${path}`;
}

export type PublicLocale = Locale;

/** Japanese-first: bare URLs are JA; only explicit en switches. */
export function resolvePublicLocale(value?: string | null): PublicLocale {
  return value === "en" ? "en" : "ja";
}

/** JA = bare path; EN = ?locale=en */
export function withLocale(path: string, locale: PublicLocale): string {
  const url = new URL(path, "http://local.invalid");
  if (locale === "en") url.searchParams.set("locale", "en");
  else url.searchParams.delete("locale");
  const qs = url.searchParams.toString();
  return `${url.pathname}${qs ? `?${qs}` : ""}`;
}
