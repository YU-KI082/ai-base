import type { BrandMemory } from "./types.js";
import type { BrandPhotoPreset } from "./photo-studio-types.js";

function brandOr(brand: BrandMemory | null, key: keyof BrandMemory, fallback: string) {
  const v = brand?.[key]?.trim();
  return v || fallback;
}

/**
 * Deterministic brand visual preset from brand memory (not AI, not fake scores).
 * Used as styling hints / labels until pixel edit AI is connected.
 */
export function resolveBrandPhotoPreset(brand: BrandMemory | null): BrandPhotoPreset {
  const blob = [
    brand?.brandName,
    brand?.industry,
    brand?.worldview,
    brand?.colors,
    brand?.concept,
    brand?.postTone,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/coffee|カフェ|珈琲|lyric|korean|韓国|木目|暖色/.test(blob)) {
    return {
      key: "warm-cafe",
      name: brand?.brandName?.trim() || "Warm Cafe",
      tags: ["暖色", "韓国カフェ風", "自然光", "木目強調", "商品を際立たせる"],
      description: "暖色と自然光でドリンク・食材を際立たせるカフェ向けプリセット",
      cssFilter:
        "brightness(1.06) contrast(1.08) saturate(1.12) sepia(0.12) hue-rotate(-6deg)",
    };
  }
  if (/street|fade|film|vintage|classic|ストリート|フィルム|ヴィンテージ|無機質/.test(blob)) {
    return {
      key: "new-classic",
      name: brand?.brandName?.trim() || "NEW CLASSIC",
      tags: ["フェード加工", "フィルム調", "ストリートカラー", "無機質", "ヴィンテージ"],
      description: "フィルム調フェードでストリート感を出すファッション向けプリセット",
      cssFilter:
        "brightness(1.02) contrast(0.95) saturate(0.82) sepia(0.18) contrast(1.05)",
    };
  }
  if (/パン|bakery|和菓子|sweet|dessert|菓子/.test(blob)) {
    return {
      key: "bakery-soft",
      name: brand?.brandName?.trim() || "Bakery Soft",
      tags: ["柔らかい光", "暖色", "食感強調", "余白", "やさしい色"],
      description: "焼き色と食感が伝わるやわらかいフード向けプリセット",
      cssFilter: "brightness(1.08) contrast(1.05) saturate(1.1) sepia(0.08)",
    };
  }

  const colors = brandOr(brand, "colors", "");
  const warm = /赤|橙|黄|茶|クリーム|暖/.test(colors);
  return {
    key: "brand-auto",
    name: brand?.brandName?.trim() || "Brand Auto",
    tags: [
      warm ? "暖色寄り" : "ニュートラル",
      brandOr(brand, "worldview", "世界観重視").slice(0, 12),
      "ブランド一致",
      "SNS映え",
      "商品フォーカス",
    ],
    description: `「${brandOr(brand, "worldview", "ブランド世界観")}」とカラー「${colors || "ニュートラル"}」に合わせた自動プリセット`,
    cssFilter: warm
      ? "brightness(1.05) contrast(1.06) saturate(1.08) sepia(0.1)"
      : "brightness(1.04) contrast(1.07) saturate(1.02)",
  };
}
