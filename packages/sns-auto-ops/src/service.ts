import { repos } from "@ai-base/database";
import {
  AUTO_OPS_SETTING_KEY,
  defaultAutoOpsSettings,
  effectiveDailyLimit,
  parseAutoOpsSettings,
  type AutoOpsMode,
  type AutoOpsSettings,
} from "./settings.js";
import {
  checkOAuthForPlatform,
  checkUrlAlive,
  contentHash,
  evaluateAutoPublishGate,
} from "./gate.js";
import { revenueLearningScore } from "./revenue-learning.js";

export async function loadAutoOpsSettings(): Promise<AutoOpsSettings> {
  const row = await repos.settings.getJson(AUTO_OPS_SETTING_KEY);
  if (!row) return defaultAutoOpsSettings();
  return parseAutoOpsSettings(row);
}

export async function saveAutoOpsSettings(
  patch: Partial<AutoOpsSettings>,
): Promise<AutoOpsSettings> {
  const current = await loadAutoOpsSettings();
  const next = parseAutoOpsSettings({ ...current, ...patch, ramp: { ...current.ramp, ...patch.ramp } });
  // Start ramp clock when enabling full_auto first time
  if (
    next.mode === "full_auto" &&
    next.ramp.enabled &&
    !next.ramp.startedAt
  ) {
    next.ramp.startedAt = new Date().toISOString();
  }
  await repos.settings.upsertJson(AUTO_OPS_SETTING_KEY, next);
  return next;
}

export async function createCriticalAlert(input: {
  kind: string;
  title: string;
  message: string;
  provider?: string;
  socialPostId?: string;
  toolId?: string;
  metadata?: Record<string, unknown>;
}) {
  return repos.opsAlerts.create({
    severity: "critical",
    kind: input.kind,
    title: input.title,
    message: input.message,
    provider: input.provider,
    socialPostId: input.socialPostId,
    toolId: input.toolId,
    metadata: (input.metadata as object) ?? {},
  });
}

async function toolAffiliateReady(toolId: string | null) {
  if (!toolId) {
    return {
      hasHealthyAffiliateLink: false,
      affiliateLinkOk: false,
      destinationUrlOk: false,
      homepageUrl: null as string | null,
      linkId: null as string | null,
    };
  }
  const links = await repos.affiliates.list(toolId);
  const healthy = links
    .filter((l) => l.isHealthy)
    .sort((a, b) => b.priority - a.priority)[0];
  if (healthy) {
    const destinationUrlOk = await checkUrlAlive(healthy.url);
    return {
      hasHealthyAffiliateLink: true,
      affiliateLinkOk: destinationUrlOk,
      destinationUrlOk,
      homepageUrl: healthy.url,
      linkId: healthy.id,
    };
  }
  const tool = await repos.tools.findById(toolId);
  const homepage = tool?.homepageUrl ?? null;
  if (!homepage) {
    return {
      hasHealthyAffiliateLink: false,
      affiliateLinkOk: false,
      destinationUrlOk: false,
      homepageUrl: null,
      linkId: null,
    };
  }
  const destinationUrlOk = await checkUrlAlive(homepage);
  return {
    hasHealthyAffiliateLink: false,
    affiliateLinkOk: false,
    destinationUrlOk,
    homepageUrl: homepage,
    linkId: null,
  };
}

export type EligibleDecision = {
  postId: string;
  platform: string;
  action: "skip" | "hold_draft" | "mark_ready" | "queue_publish";
  reasons: string[];
  decision: Record<string, unknown>;
};

/**
 * Evaluate one draft/ready post under current auto-ops settings.
 */
export async function decideForPost(postId: string): Promise<EligibleDecision> {
  const settings = await loadAutoOpsSettings();
  const post = await repos.socialPosts.findById(postId);
  if (!post) {
    return {
      postId,
      platform: "unknown",
      action: "skip",
      reasons: ["投稿が見つかりません"],
      decision: {},
    };
  }

  const aff = await toolAffiliateReady(post.toolId);
  const oauth = await checkOAuthForPlatform(post.platform);
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const postsToday = await repos.socialPosts.countPublishedSince(startOfDay);
  const lastPlatform = await repos.socialPosts.lastPublishedAt(post.platform);
  const hoursSinceLastPlatformPost = lastPlatform
    ? (Date.now() - lastPlatform.getTime()) / (60 * 60 * 1000)
    : null;
  const recent = await repos.socialPosts.listRecentContents(40);
  const minInterval =
    settings.minIntervalHoursByPlatform[post.platform] ?? 24;

  const needsMedia = ["tiktok", "instagram"].includes(post.platform);
  const gate = evaluateAutoPublishGate({
    settings,
    platform: post.platform,
    content: post.content,
    scoreTotal: post.scoreTotal,
    riskFlags: post.riskFlags,
    toolId: post.toolId,
    hasHealthyAffiliateLink: aff.hasHealthyAffiliateLink,
    destinationUrlOk: aff.destinationUrlOk,
    affiliateLinkOk: aff.affiliateLinkOk,
    mediaUrlOk: needsMedia ? Boolean(post.mediaUrl) : true,
    factsVerified: !post.riskFlags.includes("policy_risk"),
    recentContents: recent.filter((c) => c.id !== post.id).map((c) => c.content),
    postsToday,
    effectiveDailyLimit: effectiveDailyLimit(settings),
    hoursSinceLastPlatformPost,
    minIntervalHours: minInterval,
    emergencyStop: settings.emergencyStop,
    oauthOk: oauth.ok,
    oauthReason: oauth.reason,
  });

  const hash = contentHash(post.content);
  await repos.socialPosts.saveAutoDecision(post.id, {
    contentHash: hash,
    autoDecision: gate.decision as object,
  });

  // High risk → always hold + maybe alert
  if (
    post.riskFlags.includes("copyright_risk") ||
    post.riskFlags.includes("policy_risk")
  ) {
    await createCriticalAlert({
      kind: "content_risk",
      title: "著作権または規約リスクが高い投稿を停止",
      message: gate.reasons.join(" / ") || "リスクフラグ検出",
      socialPostId: post.id,
      provider: post.platform,
    });
    return {
      postId: post.id,
      platform: post.platform,
      action: "hold_draft",
      reasons: gate.reasons,
      decision: gate.decision,
    };
  }

  if (!oauth.ok) {
    await createCriticalAlert({
      kind: "oauth_disconnected",
      title: "SNS連携が切れています",
      message: oauth.reason ?? "再認証が必要です",
      provider: post.platform,
      socialPostId: post.id,
    });
  }

  if (settings.mode === "draft_only" || settings.emergencyStop) {
    return {
      postId: post.id,
      platform: post.platform,
      action: "hold_draft",
      reasons: gate.reasons.length ? gate.reasons : ["下書きのみ / 緊急停止"],
      decision: gate.decision,
    };
  }

  if (settings.mode === "approval") {
    const canReady =
      (post.scoreTotal ?? 0) >= settings.minQualityScore &&
      post.riskFlags.length === 0 &&
      aff.hasHealthyAffiliateLink;
    return {
      postId: post.id,
      platform: post.platform,
      action: canReady ? "mark_ready" : "hold_draft",
      reasons: canReady ? ["承認待ちに昇格"] : gate.reasons,
      decision: gate.decision,
    };
  }

  // full_auto
  if (gate.ok) {
    return {
      postId: post.id,
      platform: post.platform,
      action: "queue_publish",
      reasons: ["自動公開条件をすべて満たしました"],
      decision: gate.decision,
    };
  }
  return {
    postId: post.id,
    platform: post.platform,
    action: "hold_draft",
    reasons: gate.reasons,
    decision: gate.decision,
  };
}

export async function buildOpsDashboard() {
  const settings = await loadAutoOpsSettings();
  const summary = await repos.opsMetrics.salesSummary();
  const openAlerts = await repos.opsAlerts.listOpen(10);
  const health = {
    mode: settings.mode as AutoOpsMode,
    emergencyStop: settings.emergencyStop,
    effectiveDailyLimit: effectiveDailyLimit(settings),
    rampStartedAt: settings.ramp.startedAt,
    platformsEnabled: settings.platformsEnabled,
  };
  return { settings, summary, openAlerts, health };
}

export { revenueLearningScore, loadAutoOpsSettings as getSettings };
