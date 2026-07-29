import type { AgentPlugin } from "@ai-base/agents-sdk";
import {
  EventTypes,
  createEvent,
  parseEvent,
  SnsOAuthRefreshTickDataSchema,
  SnsPostPublishRequestedDataSchema,
} from "@ai-base/events";
import { repos } from "@ai-base/database";
import { evaluateAutoStop } from "@ai-base/sns-auto-ops";
import {
  ensureReadyForPublish,
  getAccessToken,
  getProvider,
  isOAuthProvider,
  oauthProviderForPlatform,
  refreshDueConnections,
} from "@ai-base/sns-oauth";

/**
 * Maintains Instagram/TikTok/X/Threads OAuth sessions (token refresh) and
 * publishes approved social posts via official APIs — never password login.
 */
export const snsOauthPlugin: AgentPlugin = {
  manifest: {
    key: "sns-oauth",
    version: "0.3.0",
    displayName: {
      en: "SNS OAuth",
      ja: "SNS OAuth連携",
    },
    subscribe: [
      EventTypes.SnsOAuthRefreshTick,
      EventTypes.SnsPostPublishRequested,
    ],
    publish: [
      EventTypes.SnsOAuthReauthRequired,
      EventTypes.SnsPostPublishedExternal,
    ],
    capabilities: [
      "oauth_refresh",
      "instagram_publish",
      "tiktok_publish",
      "x_publish",
      "threads_publish",
      "note_queue",
    ],
  },

  async handle(ctx, event) {
    if (event.type === EventTypes.SnsOAuthRefreshTick) {
      parseEvent(event, SnsOAuthRefreshTickDataSchema);
      const results = await refreshDueConnections();
      for (const result of results) {
        if (result.reauthRequired && isOAuthProvider(result.provider)) {
          await ctx.logger.warn(
            `OAuth re-auth required: ${result.provider} ${result.error ?? ""}`,
          );
          await repos.logs.write({
            level: "warn",
            source: "sns-oauth",
            message: `再認証が必要です: ${result.provider} — ${result.error ?? ""}`,
            context: { provider: result.provider, error: result.error },
          });
          await ctx.publish(
            createEvent({
              type: EventTypes.SnsOAuthReauthRequired,
              source: "agent:sns-oauth",
              dataschema: "https://ai-base.local/schemas/sns-oauth-reauth.json",
              correlationid: event.correlationid,
              causationid: event.id,
              data: {
                provider: result.provider,
                reason: result.error ?? "refresh_failed",
              },
            }),
          );
        }
      }
      await ctx.logger.info(
        `OAuth refresh tick complete checked=${results.length} failed=${results.filter((r) => !r.ok).length}`,
      );
      return;
    }

    if (event.type === EventTypes.SnsPostPublishRequested) {
      const data = parseEvent(event, SnsPostPublishRequestedDataSchema).data;
      const post = await repos.socialPosts.findById(data.socialPostId);
      if (!post) {
        await ctx.logger.error(`Social post not found: ${data.socialPostId}`);
        return;
      }
      if (
        post.status !== "ready" &&
        post.status !== "scheduled" &&
        post.status !== "retry" &&
        post.status !== "published"
      ) {
        await ctx.logger.warn(
          `Post not approved for publish id=${post.id} status=${post.status}`,
        );
        return;
      }

      await repos.socialPosts.incrementPublishAttempts(post.id);

      const ready = await ensureReadyForPublish(post.platform);
      if (!ready.ok) {
        await repos.socialPosts.markPublishOutcome(post.id, {
          status: "failed",
          lastPublishError: ready.reason,
        });
        await repos.logs.write({
          level: "error",
          source: "sns-oauth",
          message: `投稿前接続チェック失敗 (${post.platform}): ${ready.reason}`,
          context: { socialPostId: post.id, reason: ready.reason },
        });
        if (ready.provider) {
          await ctx.publish(
            createEvent({
              type: EventTypes.SnsOAuthReauthRequired,
              source: "agent:sns-oauth",
              dataschema: "https://ai-base.local/schemas/sns-oauth-reauth.json",
              correlationid: event.correlationid,
              causationid: event.id,
              data: {
                provider: ready.provider,
                reason: ready.reason,
              },
            }),
          );
        }
        return;
      }

      const provider = oauthProviderForPlatform(post.platform);
      if (!provider) {
        // note draft queue
        if (post.platform === "note") {
          const { getNotePublisher } = await import("@ai-base/sns-oauth");
          const note = getNotePublisher();
          const result = await note.publish({
            title: post.content.split("\n")[0]?.slice(0, 80) || "AI BASE",
            body: post.content,
            tags: post.hashtags,
          });
          await repos.socialPosts.markPublishOutcome(post.id, {
            status: result.status === "published" ? "published" : "scheduled",
            externalPostId: result.externalPostId,
            lastPublishError: result.message,
          });
          return;
        }
        await repos.socialPosts.markPublishOutcome(post.id, {
          status: "failed",
          lastPublishError: `No OAuth publisher for ${post.platform}`,
        });
        return;
      }
      const accessToken = await getAccessToken(provider);
      if (!accessToken) {
        await repos.socialPosts.markPublishOutcome(post.id, {
          status: "failed",
          lastPublishError: "No access token after validation",
        });
        await ctx.logger.error(
          `No access token after validation provider=${provider}`,
        );
        return;
      }

      const port = getProvider(provider);
      if (!port.publish) {
        const externalPostId = `pending:${provider}:${post.id}`;
        await repos.socialPosts.markPublishOutcome(post.id, {
          status: "scheduled",
          externalPostId,
          lastPublishError:
            "Official publish adapter not wired — caption/scripts ready, awaiting API",
        });
        await repos.logs.write({
          level: "info",
          source: "sns-oauth",
          message: `接続確認済み・投稿API未接続のため投稿待ち: ${post.id}`,
          context: { externalPostId, provider },
        });
        return;
      }

      try {
        const published = await port.publish({
          accessToken,
          content: post.content,
          mediaUrl: post.mediaUrl,
        });
        await repos.socialPosts.markExternalPublished(post.id, {
          externalPostId: published.externalPostId,
        });
        await ctx.publish(
          createEvent({
            type: EventTypes.SnsPostPublishedExternal,
            source: "agent:sns-oauth",
            dataschema: "https://ai-base.local/schemas/sns-post-published.json",
            correlationid: event.correlationid,
            causationid: event.id,
            data: {
              socialPostId: post.id,
              platform: post.platform,
              externalPostId: published.externalPostId,
            },
          }),
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const code = (error as { code?: string }).code;
        const attempts = post.publishAttempts + 1;
        const maxRetries = post.maxPublishRetries ?? 3;

        if (
          code === "awaiting_assets" ||
          code === "awaiting_api_review" ||
          /awaiting|mediaUrl|audit|scope/i.test(message)
        ) {
          const reason =
            code === "awaiting_api_review" ? "awaiting_api_review" : "awaiting_assets";
          const scripts = Array.isArray(post.scriptJson)
            ? (post.scriptJson as Array<{
                durationSec: number;
                hook: string;
                cta: string;
                hashtags?: string[];
                aiBaseCta?: string;
                caption?: string;
                beats?: unknown[];
              }>)
            : [];
          await repos.socialPosts.markPublishOutcome(post.id, {
            status: "scheduled",
            externalPostId: `awaiting:${provider}:${post.id}`,
            lastPublishError: message.slice(0, 2000),
          });
          await repos.socialPosts.saveAutoDecision(post.id, {
            contentHash: post.contentHash ?? `awaiting:${post.id}`,
            autoDecision: {
              publishWait: {
                reason,
                noPasswordAutomation: true,
                description: post.content.slice(0, 2000),
                hashtags: post.hashtags,
                scripts: scripts.map((s) => ({
                  durationSec: s.durationSec,
                  hook: s.hook,
                  cta: s.cta,
                  beatCount: Array.isArray(s.beats) ? s.beats.length : 0,
                })),
                readyWhen:
                  reason === "awaiting_assets"
                    ? "Attach 9:16 mediaUrl then retry"
                    : "TikTok app audit / video.publish scope",
              },
            },
          });
          await repos.logs.write({
            level: "info",
            source: "sns-oauth",
            message: `TikTok等: 動画/API準備待ちとして投稿キュー保留 (${post.id})`,
            context: { code, message, reason },
          });
          return;
        }

        const nextStatus =
          attempts >= maxRetries ? "failed" : ("retry" as const);
        await repos.socialPosts.markPublishOutcome(post.id, {
          status: nextStatus,
          lastPublishError: message.slice(0, 2000),
        });
        await ctx.logger.error(
          `Publish failed id=${post.id} status=${nextStatus}: ${message}`,
        );

        if (
          /auth|token|revoked|expired|OAuthException|unauthorized/i.test(message)
        ) {
          await evaluateAutoStop({
            reason: "oauth_auth_failed",
            message: message.slice(0, 500),
            provider: post.platform,
            socialPostId: post.id,
          });
        } else if (attempts >= maxRetries) {
          await evaluateAutoStop({
            reason: "consecutive_failures",
            message: `Publish failed ${attempts} times: ${message.slice(0, 300)}`,
            provider: post.platform,
            socialPostId: post.id,
          });
        }
      }
    }
  },
};
