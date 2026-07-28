/**
 * Marketplace-facing Agent Manifest.
 * Extends the runtime plugin contract without breaking existing agents.
 */
export type LocaleText = string | { en: string; ja?: string; [locale: string]: string | undefined };

export type RequiredProviders = {
  llm?: string[];
  embedding?: string[];
  vector?: string[];
};

export type AgentDependencySpec = {
  key: string;
  /** Semver range; "*" means any installed version */
  versionRange?: string;
  optional?: boolean;
};

export type MarketplaceVisibility = "free" | "paid" | "internal" | "community";

/**
 * Canonical plugin manifest for Agent Marketplace + runtime.
 * Existing agents only need key/version/displayName/subscribe/publish/capabilities.
 */
export type MarketplaceAgentManifest = {
  key: string;
  version: string;
  name: LocaleText;
  description?: LocaleText;
  /** Runtime event contracts */
  subscribe: string[];
  publish: string[];
  capabilities: string[];
  /** Fine-grained agent permissions (e.g. knowledge.write, tools.publish) */
  permissions?: string[];
  /** Providers this agent needs at runtime */
  requiredProviders?: RequiredProviders;
  /** Other agent keys this agent depends on */
  dependencies?: AgentDependencySpec[];
  /** Marketplace listing hints (optional for internal builtins) */
  marketplace?: {
    visibility?: MarketplaceVisibility;
    listingStatus?: "draft" | "published" | "archived" | "suspended";
    tags?: string[];
    homepageUrl?: string;
    priceUsd?: number | null;
  };
};

export function localeText(
  value: LocaleText | undefined,
  locale: "en" | "ja" = "en",
): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value[locale] ?? value.en ?? Object.values(value).find(Boolean) ?? "";
}

export function toDisplayName(manifest: MarketplaceAgentManifest): {
  en: string;
  ja: string;
} {
  return {
    en: localeText(manifest.name, "en"),
    ja: localeText(manifest.name, "ja") || localeText(manifest.name, "en"),
  };
}
