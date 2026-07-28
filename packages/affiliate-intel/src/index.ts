/**
 * Affiliate Intelligence — partnership workflow + performance metrics.
 * Never invent clicks/CV/revenue; compute rates only from real ingested numbers.
 */

export const AFFILIATE_STATUSES = [
  "uninvestigated",
  "investigating",
  "available",
  "applying",
  "partnered",
  "unavailable",
] as const;

export type AffiliateStatus = (typeof AFFILIATE_STATUSES)[number];

export const ASP_CATALOG = [
  {
    key: "official",
    labelJa: "公式",
    labelEn: "Official program",
    investigateHint: "Check tool homepage / partner or referral pages",
  },
  {
    key: "a8",
    labelJa: "A8.net",
    labelEn: "A8.net",
    investigateHint: "Search program on A8.net",
  },
  {
    key: "moshimo",
    labelJa: "もしもアフィリエイト",
    labelEn: "Moshimo",
    investigateHint: "Search on moshimo.jp",
  },
  {
    key: "accesstrade",
    labelJa: "アクセストレード",
    labelEn: "AccessTrade",
    investigateHint: "Search on accesstrade.net",
  },
  {
    key: "valuecommerce",
    labelJa: "バリューコマース",
    labelEn: "ValueCommerce",
    investigateHint: "Search on valuecommerce.ne.jp",
  },
] as const;

export type AspKey = (typeof ASP_CATALOG)[number]["key"];

export const STATUS_LABEL_JA: Record<AffiliateStatus, string> = {
  uninvestigated: "未調査",
  investigating: "調査中",
  available: "提携可能",
  applying: "申請中",
  partnered: "提携済",
  unavailable: "提携不可",
};

/** Admin color tokens — readable on light UI */
export const STATUS_COLORS: Record<
  AffiliateStatus,
  { bg: string; fg: string; border: string }
> = {
  uninvestigated: { bg: "#f4f4f5", fg: "#3f3f46", border: "#d4d4d8" },
  investigating: { bg: "#eff6ff", fg: "#1d4ed8", border: "#bfdbfe" },
  available: { bg: "#ecfdf5", fg: "#047857", border: "#a7f3d0" },
  applying: { bg: "#fff7ed", fg: "#c2410c", border: "#fed7aa" },
  partnered: { bg: "#f0fdf4", fg: "#15803d", border: "#86efac" },
  unavailable: { bg: "#fef2f2", fg: "#b91c1c", border: "#fecaca" },
};

export function isAffiliateStatus(value: string): value is AffiliateStatus {
  return (AFFILIATE_STATUSES as readonly string[]).includes(value);
}

export function proposeAspInvestigations(): Array<{
  aspKey: AspKey;
  aspLabel: string;
  status: AffiliateStatus;
  notes: string;
}> {
  return ASP_CATALOG.map((asp) => ({
    aspKey: asp.key,
    aspLabel: asp.labelJa,
    status: "uninvestigated" as const,
    notes: `調査提案: ${asp.investigateHint}`,
  }));
}

/** Derive tool-level status from ASP leads (partnered wins, else applying, …). */
export function deriveOverallStatus(
  leadStatuses: AffiliateStatus[],
): AffiliateStatus {
  if (leadStatuses.length === 0) return "uninvestigated";
  if (leadStatuses.includes("partnered")) return "partnered";
  if (leadStatuses.includes("applying")) return "applying";
  if (leadStatuses.includes("available")) return "available";
  if (leadStatuses.includes("investigating")) return "investigating";
  if (leadStatuses.every((s) => s === "unavailable")) return "unavailable";
  return "uninvestigated";
}

export type PerformanceInput = {
  clicks: number;
  conversions: number;
  /** Gross affiliate reward / sales in USD (or site currency as stored) */
  revenue: number;
};

export type PerformanceMetrics = {
  clicks: number;
  conversions: number;
  sales: number;
  rewardAmount: number;
  cvr: number | null;
  epc: number | null;
};

export function computePerformance(input: PerformanceInput): PerformanceMetrics {
  const clicks = Math.max(0, input.clicks);
  const conversions = Math.max(0, input.conversions);
  const revenue = Math.max(0, input.revenue);
  return {
    clicks,
    conversions,
    sales: revenue,
    rewardAmount: revenue,
    cvr: clicks > 0 ? conversions / clicks : null,
    epc: clicks > 0 ? revenue / clicks : null,
  };
}

export function hasAffiliateLabel(hasAffiliate: boolean | null | undefined): string {
  if (hasAffiliate === true) return "あり";
  if (hasAffiliate === false) return "なし";
  return "未確認";
}
