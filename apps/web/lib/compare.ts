export function parseCompareSlugs(raw?: string | null, max = 3): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(",")) {
    const slug = part.trim();
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push(slug);
    if (out.length >= max) break;
  }
  return out;
}

export function orderBySlug<T extends { slug: string }>(
  items: T[],
  slugs: string[],
): T[] {
  return slugs
    .map((slug) => items.find((item) => item.slug === slug))
    .filter(Boolean) as T[];
}
