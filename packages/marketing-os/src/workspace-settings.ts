import { z } from "zod";

export const WorkspaceSettingsSchema = z.object({
  notifications: z
    .object({
      dailyBrief: z.boolean().optional(),
      tasks: z.boolean().optional(),
    })
    .optional(),
  locale: z.enum(["ja", "en"]).optional(),
});

export type WorkspaceSettings = z.infer<typeof WorkspaceSettingsSchema>;

export const DEFAULT_WORKSPACE_SETTINGS: WorkspaceSettings = {
  notifications: {
    dailyBrief: true,
    tasks: true,
  },
  locale: "ja",
};

export function parseWorkspaceSettings(raw: unknown): WorkspaceSettings {
  const parsed = WorkspaceSettingsSchema.safeParse(raw ?? {});
  if (!parsed.success) return { ...DEFAULT_WORKSPACE_SETTINGS };
  return {
    ...DEFAULT_WORKSPACE_SETTINGS,
    ...parsed.data,
    notifications: {
      ...DEFAULT_WORKSPACE_SETTINGS.notifications,
      ...parsed.data.notifications,
    },
  };
}

export const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  pro: "Pro",
  business: "Business",
};
