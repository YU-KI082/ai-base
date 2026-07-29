import { repos } from "@ai-base/database";
import { createCriticalAlert, loadAutoOpsSettings, saveAutoOpsSettings } from "./service.js";

export type AutoStopReason =
  | "oauth_auth_failed"
  | "token_revoked"
  | "publish_rejected"
  | "consecutive_failures"
  | "policy_violation"
  | "cost_spike"
  | "duplicate_flood"
  | "manual";

/**
 * Evaluate auto-stop conditions. On trip: emergencyStop=true + critical alert.
 * Normal post success does NOT notify admins.
 */
export async function evaluateAutoStop(input?: {
  reason?: AutoStopReason;
  message?: string;
  provider?: string;
  socialPostId?: string;
}): Promise<{ stopped: boolean; reason?: AutoStopReason }> {
  const settings = await loadAutoOpsSettings();
  if (settings.emergencyStop) {
    return { stopped: true, reason: "manual" };
  }

  if (input?.reason) {
    await saveAutoOpsSettings({ emergencyStop: true });
    await createCriticalAlert({
      kind: `auto_stop_${input.reason}`,
      title: `SNS自動運用を停止: ${input.reason}`,
      message:
        input.message ??
        "Safety auto-stop triggered. Re-auth or review before clearing emergency stop.",
      provider: input.provider,
      socialPostId: input.socialPostId,
      metadata: { reason: input.reason },
    });
    return { stopped: true, reason: input.reason };
  }

  // Consecutive failures across platforms
  const recent = await repos.socialPosts.list("failed");
  const failed = recent.filter(
    (p) => Date.now() - p.updatedAt.getTime() < 24 * 60 * 60 * 1000,
  );
  if (failed.length >= settings.consecutiveFailureAlertThreshold) {
    return evaluateAutoStop({
      reason: "consecutive_failures",
      message: `${failed.length} failed posts in 24h (threshold ${settings.consecutiveFailureAlertThreshold})`,
    });
  }

  // Duplicate flood: many drafts with same contentHash
  const recentContents = await repos.socialPosts.listRecentContents(40);
  const hashes = recentContents
    .map((r) => r.contentHash)
    .filter((h): h is string => Boolean(h));
  const counts = new Map<string, number>();
  for (const h of hashes) counts.set(h, (counts.get(h) ?? 0) + 1);
  for (const [h, n] of counts) {
    if (n >= 5) {
      return evaluateAutoStop({
        reason: "duplicate_flood",
        message: `Same contentHash repeated ${n} times (${h.slice(0, 12)}…)`,
      });
    }
  }

  // Cost spike: if VIDEO_COST_DAILY_USD exceeded (operator-reported via env)
  const costCap = Number(process.env.SNS_DAILY_COST_CAP_USD ?? "0");
  const spent = Number(process.env.SNS_DAILY_COST_SPENT_USD ?? "0");
  if (costCap > 0 && spent > costCap) {
    return evaluateAutoStop({
      reason: "cost_spike",
      message: `Daily SNS cost ${spent} exceeds cap ${costCap}`,
    });
  }

  return { stopped: false };
}

/** Exponential backoff delay in ms for publish attempt N (1-based). */
export function publishBackoffMs(attempt: number): number {
  const base = 60_000;
  const capped = Math.min(6, Math.max(1, attempt));
  return base * 2 ** (capped - 1);
}
