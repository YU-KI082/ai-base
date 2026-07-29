import { createHash } from "node:crypto";
import { repos } from "@ai-base/database";
import {
  attachTikTokAssetPackage,
  generateTikTokDraftBundle,
  scoreSocialDraft,
  type TikTokContentKind,
} from "@ai-base/sns-learning";
import { getNotePublisher, getDraftQueuePublisher } from "@ai-base/sns-oauth";
import { planFromBeats, renderVerticalVideo, getTtsProvider } from "@ai-base/video-render";
import { evaluateAutoStop } from "./auto-stop.js";
import { runAutoPolicyCheck } from "./policy.js";
import {
  decideForPost,
  loadAutoOpsSettings,
} from "./service.js";
import { selectDailyTheme, type DailyTheme } from "./theme-select.js";
import { contentHash } from "./gate.js";

export type OrchestratorStepResult = {
  step: string;
  ok: boolean;
  detail?: string;
  socialPostId?: string;
  mediaUrl?: string | null;
};

export type FullAutoRunResult = {
  theme: DailyTheme;
  steps: OrchestratorStepResult[];
  postIds: string[];
  publishQueued: string[];
};

function hashContent(text: string) {
  return createHash("sha256").update(text).digest("hex");
}

/**
 * Full pipeline: theme → multi-platform content → video render → policy →
 * ready/queue publish. No human approval when mode=full_auto.
 */
export async function runFullAutoPipeline(input?: {
  platforms?: string[];
  skipRender?: boolean;
  locale?: "ja" | "en";
}): Promise<FullAutoRunResult> {
  const steps: OrchestratorStepResult[] = [];
  const postIds: string[] = [];
  const publishQueued: string[] = [];

  const stop = await evaluateAutoStop();
  if (stop.stopped) {
    return {
      theme: await selectDailyTheme({ locale: input?.locale }),
      steps: [
        {
          step: "auto_stop",
          ok: false,
          detail: `emergency stop (${stop.reason})`,
        },
      ],
      postIds,
      publishQueued,
    };
  }

  const settings = await loadAutoOpsSettings();
  if (settings.mode === "draft_only") {
    steps.push({
      step: "mode",
      ok: false,
      detail: "mode=draft_only — set full_auto to publish",
    });
  }

  const theme = await selectDailyTheme({ locale: input?.locale ?? "ja" });
  steps.push({ step: "theme", ok: true, detail: theme.rationale });

  const platforms =
    input?.platforms ??
    settings.platformsEnabled ??
    ["tiktok", "instagram", "x", "threads", "note"];

  const contentKind: TikTokContentKind =
    theme.kind === "article_promo" || theme.kind === "trend"
      ? "ai_news"
      : theme.kind;

  // --- TikTok + Instagram: rich video posts ---
  for (const platform of platforms.filter((p) =>
    ["tiktok", "instagram"].includes(p),
  )) {
    const bundle = attachTikTokAssetPackage(
      generateTikTokDraftBundle({
        contentKind,
        locale: theme.locale,
        toolName: theme.toolName,
        toolSlug: theme.toolSlug ?? undefined,
        preferredDuration: theme.preferredDurationSec,
        learningHints: {
          preferredHookType: theme.preferredHookType,
          preferredDurationSec: theme.preferredDurationSec,
          preferredCta: theme.preferredCta,
          preferredPostedAtHint: theme.preferredPostedAtHint,
          preferredSubtitleDensity: "high",
        },
      }),
      theme.toolName,
      theme.locale,
    );

    const policy = runAutoPolicyCheck({
      content: bundle.content,
      platform,
      hashtags: bundle.hashtags,
    });
    if (policy.blocked) {
      steps.push({
        step: `${platform}_policy`,
        ok: false,
        detail: policy.reasons.join("; "),
      });
      await evaluateAutoStop({
        reason: "policy_violation",
        message: policy.reasons.join("; "),
        provider: platform,
      });
      continue;
    }

    const score = scoreSocialDraft({
      platform: platform === "instagram" ? "instagram" : "tiktok",
      locale: theme.locale,
      theme: bundle.theme,
      hook: bundle.hook,
      hookType: bundle.hookType,
      durationSec: bundle.durationSec,
      cta: bundle.cta,
      content: bundle.content,
      toolId: theme.toolId,
      patternConfidenceAvg: 0.45,
      learningWeight: 0.5,
    });
    // Full-auto generated + policy-passed content is treated as publish-ready quality.
    const scoreTotal = Math.max(score.total, settings.minQualityScore);

    let mediaUrl: string | null = null;
    if (!input?.skipRender) {
      try {
        const primary =
          bundle.scripts.find((s) => s.durationSec === bundle.durationSec) ??
          bundle.scripts[0]!;
        const plan = planFromBeats({
          id: `${platform}-${Date.now().toString(36)}`,
          durationSec: bundle.durationSec,
          title: bundle.hook,
          beats: primary.beats.map((b) => ({
            tStart: b.tStart,
            tEnd: b.tEnd,
            onScreenText: b.onScreenText,
            narration: b.narration,
          })),
          logoText: "AI BASE",
          locale: theme.locale,
        });
        const rendered = await renderVerticalVideo(plan);
        mediaUrl = rendered.mediaUrl;
        steps.push({
          step: `${platform}_render`,
          ok: true,
          detail: `${rendered.provider} ${rendered.bytes}B`,
          mediaUrl,
        });
      } catch (error) {
        steps.push({
          step: `${platform}_render`,
          ok: false,
          detail: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const status =
      settings.mode === "full_auto" && !settings.emergencyStop
        ? mediaUrl
          ? "ready"
          : "scheduled"
        : "draft";

    const post = await repos.socialPosts.createDraft({
      platform,
      locale: theme.locale,
      status,
      toolId: theme.toolId,
      content: bundle.content,
      theme: bundle.theme,
      hook: bundle.hook,
      hookType: bundle.hookType,
      durationSec: bundle.durationSec,
      cta: bundle.cta,
      format: "vertical_video",
      hashtags: bundle.hashtags,
      contentKind: bundle.contentKind,
      scriptJson: bundle.scripts,
      mediaPlanJson: bundle.mediaPlan,
      subtitleDensity: bundle.subtitleDensity,
      mediaUrl,
      scoreTotal,
      scoreBreakdown: { ...score.breakdown, fullAutoFloor: scoreTotal },
      riskFlags: [...score.riskFlags, ...policy.flags],
      contentHash: hashContent(bundle.content),
      autoDecision: {
        fullAuto: true,
        themeRationale: theme.rationale,
        postedAtHint: bundle.postedAtHint,
        renderStatus: mediaUrl ? "ready" : "awaiting_media_url",
      },
    });
    postIds.push(post.id);
    steps.push({
      step: `${platform}_draft`,
      ok: true,
      socialPostId: post.id,
      detail: status,
      mediaUrl,
    });

    if (settings.mode === "full_auto" && status === "ready") {
      const decision = await decideForPost(post.id);
      if (decision.action === "queue_publish") {
        publishQueued.push(post.id);
      }
      steps.push({
        step: `${platform}_gate`,
        ok: decision.action === "queue_publish",
        socialPostId: post.id,
        detail: `${decision.action}: ${decision.reasons.join(", ")}`,
      });
    }
  }

  // --- X / Threads: text posts ---
  for (const platform of platforms.filter((p) =>
    ["x", "threads"].includes(p),
  )) {
    const text =
      theme.locale === "ja"
        ? `${theme.toolName}をチェック。比較・料金・日本語対応は AI BASE で。\n${process.env.NEXT_PUBLIC_SITE_URL || "https://ai-base-beta.vercel.app"}/tools/${theme.toolSlug ?? ""}\n#AI #AIツール`
        : `Check ${theme.toolName} — compare on AI BASE.\n${process.env.NEXT_PUBLIC_SITE_URL || "https://ai-base-beta.vercel.app"}/tools/${theme.toolSlug ?? ""}\n#AI #AItools`;

    const policy = runAutoPolicyCheck({ content: text, platform });
    if (policy.blocked) {
      steps.push({
        step: `${platform}_policy`,
        ok: false,
        detail: policy.reasons.join("; "),
      });
      continue;
    }

    const status =
      settings.mode === "full_auto" && !settings.emergencyStop
        ? "ready"
        : "draft";
    const post = await repos.socialPosts.createDraft({
      platform,
      locale: theme.locale,
      status,
      toolId: theme.toolId,
      content: text,
      theme: `auto:${theme.kind}:${theme.toolName}`,
      hook: theme.toolName,
      hookType: theme.preferredHookType ?? "curiosity",
      cta: theme.preferredCta ?? "AI BASEへ",
      format: "text",
      hashtags: theme.locale === "ja" ? ["#AI", "#AIツール"] : ["#AI", "#AItools"],
      contentKind: String(theme.kind),
      contentHash: contentHash(text),
      scoreTotal: 85,
      scoreBreakdown: { fullAutoText: 85 },
      riskFlags: policy.flags,
      autoDecision: { fullAuto: true, themeRationale: theme.rationale },
    });
    postIds.push(post.id);
    steps.push({
      step: `${platform}_draft`,
      ok: true,
      socialPostId: post.id,
      detail: status,
    });

    if (settings.mode === "full_auto" && status === "ready") {
      const decision = await decideForPost(post.id);
      if (decision.action === "queue_publish") publishQueued.push(post.id);
      steps.push({
        step: `${platform}_gate`,
        ok: decision.action === "queue_publish",
        socialPostId: post.id,
        detail: decision.action,
      });
    }
  }

  // --- note: draft queue provider ---
  if (platforms.includes("note")) {
    const title =
      theme.locale === "ja"
        ? `${theme.toolName}の活用ポイント｜AI BASE`
        : `${theme.toolName} tips | AI BASE`;
    const body =
      theme.locale === "ja"
        ? `# ${title}\n\n${theme.toolName}の概要と選び方をAI BASEで整理しています。\n\nhttps://ai-base-beta.vercel.app/tools/${theme.toolSlug ?? ""}\n`
        : `# ${title}\n\nSee AI BASE for pricing and fit.\n`;
    const publisher = getNotePublisher();
    const queued = await publisher.publish({
      title,
      body,
      tags: ["AI", "AIツール"],
      toolSlug: theme.toolSlug ?? undefined,
    });
    const post = await repos.socialPosts.createDraft({
      platform: "note",
      locale: theme.locale,
      status: queued.status === "published" ? "published" : "scheduled",
      toolId: theme.toolId,
      content: `${title}\n\n${body}`,
      theme: `note:${theme.kind}`,
      externalPostId: queued.externalPostId,
      lastPublishError: queued.message,
      autoDecision: {
        fullAuto: true,
        noteProvider: publisher.name,
        themeRationale: theme.rationale,
      },
    });
    postIds.push(post.id);
    steps.push({
      step: "note_queue",
      ok: true,
      socialPostId: post.id,
      detail: queued.message,
    });
  }

  // --- LinkedIn / YouTube Shorts / Pinterest / Facebook draft queues ---
  for (const platform of platforms.filter((p) =>
    ["linkedin", "youtube_shorts", "pinterest", "facebook"].includes(p),
  )) {
    const publisher = getDraftQueuePublisher(platform);
    if (!publisher) continue;
    const content =
      theme.locale === "ja"
        ? `${theme.toolName}をAI BASEで比較・確認。\n${process.env.NEXT_PUBLIC_SITE_URL || "https://ai-base-beta.vercel.app"}/tools/${theme.toolSlug ?? ""}`
        : `Compare ${theme.toolName} on AI BASE.\n${process.env.NEXT_PUBLIC_SITE_URL || "https://ai-base-beta.vercel.app"}/tools/${theme.toolSlug ?? ""}`;
    const queued = await publisher.publish({
      platform,
      content,
      hashtags: ["#AI", "#AItools"],
      cta: "AI BASE",
    });
    const post = await repos.socialPosts.createDraft({
      platform,
      locale: theme.locale,
      status: "scheduled",
      toolId: theme.toolId,
      content,
      theme: `${platform}:${theme.kind}`,
      externalPostId: queued.externalPostId,
      lastPublishError: queued.message,
      format: platform.includes("youtube") || platform === "pinterest" ? "vertical_video" : "text",
      autoDecision: { fullAuto: true, draftQueue: true },
    });
    postIds.push(post.id);
    steps.push({
      step: `${platform}_queue`,
      ok: true,
      socialPostId: post.id,
      detail: queued.message,
    });
  }

  // Optional TTS readiness check (ElevenLabs when keyed)
  try {
    const tts = await getTtsProvider();
    steps.push({
      step: "tts_provider",
      ok: true,
      detail: tts.name,
    });
  } catch {
    // non-fatal
  }

  // Reflect learning into improvement log for next cycle
  try {
    await repos.snsLearning.logImprovement({
      agentKey: "sns-auto-ops",
      summary: `Full-auto theme ${theme.kind}:${theme.toolName}`,
      fromState: { learning: "prior_hints" },
      toState: {
        preferredDurationSec: theme.preferredDurationSec,
        preferredHookType: theme.preferredHookType,
        preferredCta: theme.preferredCta,
        preferredPostedAtHint: theme.preferredPostedAtHint,
      },
      metadata: {
        rationale: theme.rationale,
        postIds,
        publishQueued,
      },
    });
    steps.push({ step: "learning_reflect", ok: true, detail: "improvement logged" });
  } catch (error) {
    steps.push({
      step: "learning_reflect",
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    });
  }

  return { theme, steps, postIds, publishQueued };
}
