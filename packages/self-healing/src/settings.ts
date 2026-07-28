import { z } from "zod";

export const SELF_HEALING_SETTING_KEY = "self_healing_settings";

export const SelfHealingSettingsSchema = z.object({
  /** Hard stop — no auto apply / no healing cycles. */
  emergencyStop: z.boolean().default(true),
  /** Never write patches when NODE_ENV=production (always enforced in code too). */
  allowProductionDirectApply: z.literal(false).default(false),
  maxAttemptsPerFingerprint: z.number().int().min(1).max(5).default(3),
  autoApplyEnabled: z.boolean().default(true),
  maxFilesPerFix: z.number().int().min(1).max(20).default(5),
});

export type SelfHealingSettings = z.infer<typeof SelfHealingSettingsSchema>;

export function defaultSelfHealingSettings(): SelfHealingSettings {
  return SelfHealingSettingsSchema.parse({});
}

export function parseSelfHealingSettings(raw: unknown): SelfHealingSettings {
  return SelfHealingSettingsSchema.parse(raw ?? {});
}
