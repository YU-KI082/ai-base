import type { Metadata } from "next";
import { absoluteUrl, type PublicLocale, withLocale } from "@/lib/site";

export function localeAlternates(
  path: string,
): NonNullable<Metadata["alternates"]> {
  const en = absoluteUrl(withLocale(path, "en"));
  const ja = absoluteUrl(withLocale(path, "ja"));
  return {
    canonical: ja,
    languages: {
      ja,
      en,
      "x-default": ja,
    },
  };
}

export function localeAlternatesFor(
  path: string,
  locale: PublicLocale,
): NonNullable<Metadata["alternates"]> {
  const en = absoluteUrl(withLocale(path, "en"));
  const ja = absoluteUrl(withLocale(path, "ja"));
  return {
    canonical: absoluteUrl(withLocale(path, locale)),
    languages: {
      ja,
      en,
      "x-default": ja,
    },
  };
}

export function softwareApplicationJsonLd(input: {
  name: string;
  description?: string | null;
  url: string;
  applicationCategory?: string;
  pricingModel?: string | null;
  offersPrice?: string;
}): Record<string, unknown> {
  const price =
    input.offersPrice ??
    (input.pricingModel === "free" || input.pricingModel === "freemium"
      ? "0"
      : undefined);
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: input.name,
    description: input.description ?? undefined,
    url: input.url,
    applicationCategory: input.applicationCategory ?? "BusinessApplication",
    offers: {
      "@type": "Offer",
      price: price ?? "0",
      priceCurrency: "JPY",
      ...(input.pricingModel ? { category: input.pricingModel } : {}),
    },
  };
}

export function faqPageJsonLd(
  items: Array<{ question: string; answer: string }>,
): Record<string, unknown> | null {
  if (!items.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function breadcrumbListJsonLd(
  items: Array<{ name: string; url: string }>,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function articleJsonLd(input: {
  title: string;
  description?: string | null;
  url: string;
  datePublished?: string | Date | null;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    description: input.description ?? undefined,
    url: input.url,
    datePublished: input.datePublished
      ? new Date(input.datePublished).toISOString()
      : undefined,
    publisher: {
      "@type": "Organization",
      name: "AI BASE",
      url: absoluteUrl("/"),
    },
  };
}
