import { z } from "zod";

export const CompanyOpsSettingsSchema = z.object({
  /** After OAuth/API setup, run without human approval */
  mode: z.enum(["full_auto", "supervised", "paused"]).default("full_auto"),
  emergencyStop: z.boolean().default(false),
  autoApproveTools: z.boolean().default(true),
  autoPublishArticles: z.boolean().default(true),
  researchEnabled: z.boolean().default(true),
  seoArticlesEnabled: z.boolean().default(true),
  affiliateOptimizeEnabled: z.boolean().default(true),
  snsEnabled: z.boolean().default(true),
  videoEnabled: z.boolean().default(true),
  analyticsEnabled: z.boolean().default(true),
  autoImproveEnabled: z.boolean().default(true),
  trendPredictEnabled: z.boolean().default(true),
  researchSources: z
    .array(z.string())
    .default([
      "product_hunt",
      "huggingface",
      "github_trending",
      "vendor_blogs",
      "reddit",
    ]),
  researchDailyLimit: z.number().int().min(1).max(30).default(8),
  articleKindsPerTool: z
    .array(z.string())
    .default(["recommend", "howto", "compare", "faq", "beginner"]),
  snsPlatforms: z
    .array(z.string())
    .default([
      "tiktok",
      "instagram",
      "x",
      "threads",
      "note",
      "linkedin",
      "youtube_shorts",
      "pinterest",
      "facebook",
    ]),
  activeSiteBrandKey: z.string().default("ai-base"),
});

export type CompanyOpsSettings = z.infer<typeof CompanyOpsSettingsSchema>;

export const COMPANY_OPS_SETTING_KEY = "company_ops_settings";

export function defaultCompanyOpsSettings(): CompanyOpsSettings {
  return CompanyOpsSettingsSchema.parse({});
}

export function parseCompanyOpsSettings(raw: unknown): CompanyOpsSettings {
  return CompanyOpsSettingsSchema.parse(raw ?? {});
}
