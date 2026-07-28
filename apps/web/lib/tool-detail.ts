/** Pure helpers used by tool detail presentation */

export function pickTranslation<T extends { locale: string }>(
  translations: T[],
  locale: string,
): T | undefined {
  return translations.find((t) => t.locale === locale) ?? translations[0];
}

export function primaryAffiliate<
  T extends { isHealthy: boolean; priority: number; network?: string | null },
>(links: T[]): T | undefined {
  const healthy = links.filter((l) => l.isHealthy);
  // Prefer partner / ASP links over official homepage (`direct`)
  const preferred = healthy.filter(
    (l) => l.network && l.network !== "direct" && l.network !== "official",
  );
  const pool = preferred.length > 0 ? preferred : healthy;
  return [...pool].sort((a, b) => b.priority - a.priority)[0];
}

export function normalizeFaq(
  faq: unknown,
): Array<{ question: string; answer: string }> {
  if (!Array.isArray(faq)) return [];
  return faq
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const question = String(row.q ?? row.question ?? "").trim();
      const answer = String(row.a ?? row.answer ?? "").trim();
      if (!question) return null;
      return { question, answer };
    })
    .filter(Boolean) as Array<{ question: string; answer: string }>;
}

export function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v)).filter(Boolean);
}
