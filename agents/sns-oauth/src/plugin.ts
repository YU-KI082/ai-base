import type { AgentPlugin } from "@ai-base/agents-sdk";
import {
  EventTypes,
  createEvent,
  parseEvent,
  SnsOAuthRefreshTickDataSchema,
  SnsPostPublishRequestedDataSchema,
} from "@ai-base/events";
import { repos } from "@ai-base/database";
import {
  ensureReadyForPublish,
  getAccessToken,
  getProvider,
  isOAuthProvider,
  oauthProviderForPlatform,
  refreshDueConnections,
} from "@ai-base/sns-oauth";

/**
 * Maintains Instagram/TikTok OAuth sessions (token refresh) and
 * publishes approved social posts via official APIs — never password login.
 */
export const snsOauthPlugin: AgentPlugin = {
  manifest: {
    key: "sns-oauth",
    version: "0.1.0",
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
    capabilities: ["oauth_refresh", "instagram_publish", "tiktok_publish"],
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
      if (post.status !== "ready" && post.status !== "published") {
        await ctx.logger.warn(
          `Post not approved for publish id=${post.id} status=${post.status}`,
        );
        return;
      }

      const ready = await ensureReadyForPublish(post.platform);
      if (!ready.ok) {
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
      if (!provider) return;
      const accessToken = await getAccessToken(provider);
      if (!accessToken) {
        await ctx.logger.error(
          `No access token after validation provider=${provider}`,
        );
        return;
      }

      const port = getProvider(provider);
      if (!port.publish) {
        await ctx.logger.warn(
          `Official publish API adapter not wired for ${provider} — connection verified only`,
        );
        const externalPostId = `pending:${provider}:${post.id}`;
        await repos.socialPosts.markExternalPublished(post.id, {
          externalPostId,
        });
        await repos.logs.write({
          level: "info",
          source: "sns-oauth",
          message: `接続確認済み・投稿API未接続のため保留IDを付与: ${post.id}`,
          context: { externalPostId, provider },
        });
        return;
      }

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
    }
  },
};
