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

export type PublicLocale = "en" | "ja";

export function resolvePublicLocale(value?: string | null): PublicLocale {
  return value === "ja" ? "ja" : "en";
}

export function withLocale(path: string, locale: PublicLocale): string {
  const url = new URL(path, "http://local.invalid");
  if (locale === "ja") url.searchParams.set("locale", "ja");
  else url.searchParams.delete("locale");
  const qs = url.searchParams.toString();
  return `${url.pathname}${qs ? `?${qs}` : ""}`;
}
