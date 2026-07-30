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
