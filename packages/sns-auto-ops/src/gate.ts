import { createHash } from "node:crypto";
import { ensureReadyForPublish } from "@ai-base/sns-oauth";
import type { AutoOpsSettings } from "./settings.js";

const FORBIDDEN_PATTERNS = [
  /必ず稼げる/,
  /絶対儲かる/,
  /guarantee income/i,
  /get rich with ai overnight/i,
  /無断転載/,
  /丸パクリ/,
  /公式音源をそのまま/,
  /#1 ai in the world/i,
  /史上最強/,
  /誰でも億万長者/,
];

export function contentHash(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim().toLowerCase();
  return createHash("sha256").update(normalized).digest("hex");
}

export function duplicateRatio(a: string, b: string): number {
  const ta = new Set(
    a
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length > 1),
  );
  const tb = new Set(
    b
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length > 1),
  );
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const w of ta) if (tb.has(w)) inter += 1;
  return inter / Math.max(ta.size, tb.size);
}

export function hasForbiddenPhrases(text: string): boolean {
  return FORBIDDEN_PATTERNS.some((re) => re.test(text));
}

export type GateInput = {
  settings: AutoOpsSettings;
  platform: string;
  content: string;
  scoreTotal: number | null;
  riskFlags: string[];
  riskLevel?: string | null;
  toolId: string | null;
  /** Healthy tracked affiliate link for the tool */
  hasHealthyAffiliateLink: boolean;
  /** Destination URL responds OK */
  destinationUrlOk: boolean;
  /** Affiliate /go path resolves to healthy link */
  affiliateLinkOk: boolean;
  /** Fact-check flag from scoring/decision */
  factsVerified: boolean;
  recentContents: string[];
  postsToday: number;
  effectiveDailyLimit: number;
  hoursSinceLastPlatformPost: number | null;
  minIntervalHours: number;
  emergencyStop: boolean;
  oauthOk: boolean;
  oauthReason?: string;
};

export type GateResult = {
  ok: boolean;
  reasons: string[];
  decision: Record<string, unknown>;
};

export function evaluateAutoPublishGate(input: GateInput): GateResult {
  const reasons: string[] = [];
  const decision: Record<string, unknown> = {
    scoreTotal: input.scoreTotal,
    riskFlags: input.riskFlags,
    checkedAt: new Date().toISOString(),
  };

  if (input.emergencyStop) {
    reasons.push("緊急停止中");
  }
  if (input.settings.mode === "draft_only") {
    reasons.push("モードが下書きのみ");
  }
  if (input.settings.mode === "approval") {
    reasons.push("モードが承認制（自動公開なし）");
  }
  if ((input.scoreTotal ?? 0) < input.settings.minQualityScore) {
    reasons.push(
      `品質スコア不足 (${input.scoreTotal ?? 0} < ${input.settings.minQualityScore})`,
    );
  }
  if (input.riskFlags.includes("copyright_risk")) {
    reasons.push("著作権リスクが高い");
  }
  if (input.riskFlags.includes("policy_risk")) {
    reasons.push("規約違反リスクが高い");
  }
  if (input.riskFlags.includes("hype_risk")) {
    reasons.push("誇大表現リスク");
  }
  if (input.riskLevel === "high") {
    reasons.push("総合リスクが高");
  }
  if (!input.factsVerified) {
    reasons.push("事実確認未完了");
  }
  if (!input.destinationUrlOk) {
    reasons.push("紹介先URLが無効");
  }
  if (!input.toolId) {
    reasons.push("紹介ツール未設定");
  }
  if (!input.hasHealthyAffiliateLink || !input.affiliateLinkOk) {
    reasons.push("アフィリエイト未提携またはリンク無効");
  }
  if (hasForbiddenPhrases(input.content)) {
    reasons.push("禁止表現を含む");
  }
  if (!input.oauthOk) {
    reasons.push(`SNS接続異常: ${input.oauthReason ?? "unknown"}`);
  }
  if (input.postsToday >= input.effectiveDailyLimit) {
    reasons.push(
      `本日の投稿上限に到達 (${input.postsToday}/${input.effectiveDailyLimit})`,
    );
  }
  if (
    input.hoursSinceLastPlatformPost != null &&
    input.hoursSinceLastPlatformPost < input.minIntervalHours
  ) {
    reasons.push(
      `投稿間隔不足 (${input.hoursSinceLastPlatformPost.toFixed(1)}h < ${input.minIntervalHours}h)`,
    );
  }

  let maxDup = 0;
  for (const prev of input.recentContents) {
    maxDup = Math.max(maxDup, duplicateRatio(input.content, prev));
  }
  decision.duplicateRatio = maxDup;
  if (maxDup > input.settings.maxDuplicateRatio) {
    reasons.push(`過去投稿との重複率が高い (${(maxDup * 100).toFixed(0)}%)`);
  }

  const ok = reasons.length === 0 && input.settings.mode === "full_auto";
  decision.ok = ok;
  decision.reasons = reasons;
  return { ok, reasons, decision };
}

export async function checkUrlAlive(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.ok || (res.status >= 300 && res.status < 400)) return true;
    // Some sites block HEAD — try GET range-less lightly
    const getRes = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
      headers: { Range: "bytes=0-0" },
    });
    return getRes.ok || getRes.status === 206 || getRes.status === 416;
  } catch {
    return false;
  }
}

export async function checkOAuthForPlatform(platform: string) {
  const ready = await ensureReadyForPublish(platform);
  return {
    ok: ready.ok,
    reason: ready.ok ? undefined : ready.reason,
  };
}
