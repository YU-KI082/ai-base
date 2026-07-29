/** Multi-site brand packs — clone AI BASE into vertical sites. */
export type SiteBrandPack = {
  key: string;
  name: string;
  niche: string;
  taglineJa: string;
  taglineEn: string;
  defaultLocale: "ja" | "en";
  researchHints: string[];
  colorPrimary: string;
};

export const SITE_BRAND_PACKS: SiteBrandPack[] = [
  {
    key: "ai-base",
    name: "AI BASE",
    niche: "ai_tools",
    taglineJa: "AIツール発見メディア",
    taglineEn: "Discover AI tools",
    defaultLocale: "ja",
    researchHints: ["AI", "LLM", "agents"],
    colorPrimary: "#0B1220",
  },
  {
    key: "beauty-base",
    name: "BEAUTY BASE",
    niche: "beauty",
    taglineJa: "美容・スキンケア発見",
    taglineEn: "Beauty discovery",
    defaultLocale: "ja",
    researchHints: ["skincare", "cosmetics"],
    colorPrimary: "#4A1C40",
  },
  {
    key: "travel-base",
    name: "TRAVEL BASE",
    niche: "travel",
    taglineJa: "旅行・体験の発見",
    taglineEn: "Travel discovery",
    defaultLocale: "ja",
    researchHints: ["travel", "hotels"],
    colorPrimary: "#0E3B4C",
  },
  {
    key: "money-base",
    name: "MONEY BASE",
    niche: "finance",
    taglineJa: "お金・投資の発見",
    taglineEn: "Money discovery",
    defaultLocale: "ja",
    researchHints: ["fintech", "investing"],
    colorPrimary: "#1A3A2A",
  },
  {
    key: "pet-base",
    name: "PET BASE",
    niche: "pets",
    taglineJa: "ペット用品・サービスの発見",
    taglineEn: "Pet discovery",
    defaultLocale: "ja",
    researchHints: ["pets", "dogs", "cats"],
    colorPrimary: "#3D2B1F",
  },
  {
    key: "health-base",
    name: "HEALTH BASE",
    niche: "health",
    taglineJa: "健康・ウェルネスの発見",
    taglineEn: "Health discovery",
    defaultLocale: "ja",
    researchHints: ["health", "wellness"],
    colorPrimary: "#1F3A2E",
  },
];

export function getBrandPack(key: string): SiteBrandPack {
  return SITE_BRAND_PACKS.find((b) => b.key === key) ?? SITE_BRAND_PACKS[0]!;
}

/**
 * "Clone site" = activate a brand pack in settings.
 * Does not fork code; agents read activeSiteBrandKey for niche bias.
 */
export async function activateSiteBrand(
  key: string,
  save: (patch: { activeSiteBrandKey: string }) => Promise<unknown>,
) {
  const pack = getBrandPack(key);
  await save({ activeSiteBrandKey: pack.key });
  return pack;
}
