import { z } from "zod";

export const AutoOpsModeSchema = z.enum([
  "full_auto",
  "approval",
  "draft_only",
]);
export type AutoOpsMode = z.infer<typeof AutoOpsModeSchema>;

export const AutoOpsSettingsSchema = z.object({
  mode: AutoOpsModeSchema.default("draft_only"),
  emergencyStop: z.boolean().default(true),
  /** Global daily cap across platforms */
  dailyPostLimit: z.number().int().min(0).max(50).default(1),
  /** Min hours between posts per platform */
  minIntervalHoursByPlatform: z
    .record(z.string(), z.number().min(0).max(168))
    .default({ instagram: 24, tiktok: 24 }),
  minQualityScore: z.number().min(0).max(100).default(80),
  maxDuplicateRatio: z.number().min(0).max(1).default(0.35),
  maxPublishRetries: z.number().int().min(0).max(10).default(3),
  consecutiveFailureAlertThreshold: z.number().int().min(1).max(20).default(3),
  /** Ramp: start at 1/day for N days, then increase */
  ramp: z
    .object({
      enabled: z.boolean().default(true),
      startDailyLimit: z.number().int().min(1).default(1),
      testDays: z.number().int().min(1).default(7),
      afterTestDailyLimit: z.number().int().min(1).default(2),
      startedAt: z.string().datetime().nullable().default(null),
    })
    .default({}),
  platformsEnabled: z
    .array(
      z.enum([
        "instagram",
        "tiktok",
        "x",
        "threads",
        "note",
        "linkedin",
        "youtube_shorts",
        "pinterest",
        "facebook",
      ]),
    )
    .default(["tiktok", "instagram", "x", "threads", "note"]),
});

export type AutoOpsSettings = z.infer<typeof AutoOpsSettingsSchema>;

export const AUTO_OPS_SETTING_KEY = "sns_auto_ops_settings";

export function defaultAutoOpsSettings(): AutoOpsSettings {
  // Full-auto by default after OAuth is connected; emergency stop off for continuous ops.
  // Operators can still flip emergencyStop from /admin/ops.
  return AutoOpsSettingsSchema.parse({
    mode: "full_auto",
    emergencyStop: false,
    dailyPostLimit: 3,
    minIntervalHoursByPlatform: {
      tiktok: 8,
      instagram: 12,
      x: 4,
      threads: 6,
      note: 24,
    },
    platformsEnabled: ["tiktok", "instagram", "x", "threads", "note"],
  });
}

export function parseAutoOpsSettings(raw: unknown): AutoOpsSettings {
  return AutoOpsSettingsSchema.parse(raw ?? {});
}

/** Effective daily limit considering ramp schedule. */
export function effectiveDailyLimit(
  settings: AutoOpsSettings,
  now = new Date(),
): number {
  if (!settings.ramp.enabled || !settings.ramp.startedAt) {
    return settings.dailyPostLimit;
  }
  const started = new Date(settings.ramp.startedAt).getTime();
  const days = (now.getTime() - started) / (24 * 60 * 60 * 1000);
  if (days < settings.ramp.testDays) {
    return Math.min(settings.dailyPostLimit, settings.ramp.startDailyLimit);
  }
  return Math.min(settings.dailyPostLimit, settings.ramp.afterTestDailyLimit);
}

/** Revenue-first learning weights (higher = more important). */
export const REVENUE_LEARNING_PRIORITY = [
  { key: "profit", weight: 100 },
  { key: "affiliateReward", weight: 90 },
  { key: "conversions", weight: 80 },
  { key: "cvr", weight: 70 },
  { key: "epc", weight: 60 },
  { key: "freeSignups", weight: 50 },
  { key: "linkCtr", weight: 40 },
  { key: "followRate", weight: 30 },
  { key: "plays", weight: 10 },
] as const;
