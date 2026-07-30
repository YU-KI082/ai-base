export const OS_PLATFORMS = [
  "instagram",
  "tiktok",
  "x",
  "threads",
  "youtube",
] as const;

export type OsPlatform = (typeof OS_PLATFORMS)[number];
