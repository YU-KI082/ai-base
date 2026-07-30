import { z } from "zod";

export const OS_PLATFORMS = [
  "instagram",
  "tiktok",
  "x",
  "threads",
  "youtube",
] as const;

export type OsPlatform = (typeof OS_PLATFORMS)[number];

export const NextActionSchema = z.object({
  title: z.string(),
  why: z.string(),
  effort: z.enum(["low", "mid", "high"]).default("mid"),
  deepLink: z.string().optional(),
});

export type NextAction = z.infer<typeof NextActionSchema>;

export const ActionableInsightSchema = z.object({
  summary: z.string(),
  findings: z.array(z.string()).default([]),
  nextActions: z.array(NextActionSchema).min(1),
});

export type ActionableInsight = z.infer<typeof ActionableInsightSchema>;

/** Coerce messy LLM nextActions into schema-safe rows. Drops empty titles. */
export function normalizeNextActions(raw: unknown, min = 1): NextAction[] {
  const list = Array.isArray(raw) ? raw : [];
  const out: NextAction[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const title = String(row.title ?? row.action ?? "").trim();
    const why = String(row.why ?? row.reason ?? row.detail ?? "").trim();
    if (!title) continue;
    const effortRaw = String(row.effort ?? "mid").toLowerCase();
    const effort =
      effortRaw === "low" || effortRaw === "high" ? effortRaw : "mid";
    const deepLink = String(row.deepLink ?? "").trim() || undefined;
    out.push({
      title: title.slice(0, 120),
      why: (why || title).slice(0, 400),
      effort,
      ...(deepLink ? { deepLink } : {}),
    });
  }
  if (out.length < min) {
    throw new Error("AI応答の nextActions が不足しています。再試行してください。");
  }
  return out;
}

export function normalizeActionableInsight(raw: unknown): ActionableInsight {
  const row = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const summary = String(row.summary ?? "").trim();
  if (!summary) {
    throw new Error("AI分析の要約が空でした。再試行してください。");
  }
  const findings = Array.isArray(row.findings)
    ? row.findings.map((f) => String(f ?? "").trim()).filter(Boolean)
    : [];
  return ActionableInsightSchema.parse({
    summary,
    findings,
    nextActions: normalizeNextActions(row.nextActions, 1),
  });
}

export type BrandMemory = {
  brandName: string;
  industry: string;
  targetAudience: string;
  concept: string;
  worldview: string;
  colors: string;
  competitors: string;
  postTone: string;
  products: string;
  goals: string;
};

export type SnsConnectorCapabilities = {
  oauth: boolean;
  publish: boolean;
  insights: boolean;
};

export type SnsConnectorPort = {
  platform: OsPlatform;
  capabilities: SnsConnectorCapabilities;
  startOAuth?(input: { redirectUri: string; state: string }): string;
  publish?(input: {
    accessToken: string;
    content: string;
    mediaUrl?: string | null;
  }): Promise<{ externalPostId: string }>;
  fetchInsights?(input: {
    accessToken: string;
    externalPostId: string;
  }): Promise<Record<string, number | null> | null>;
};
