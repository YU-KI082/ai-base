import type { AgentPlugin } from "@ai-base/agents-sdk";
import {
  loadCompanyOpsSettings,
} from "@ai-base/company-ops";
import {
  CompanyOpsTickDataSchema,
  ContentPendingApprovalDataSchema,
  EventTypes,
  createEvent,
  parseEvent,
} from "@ai-base/events";

/**
 * AI company conductor: fans out the daily loop to specialist agents.
 * Humans only do initial OAuth / API keys; this runs 24/7.
 */
export const companyOpsPlugin: AgentPlugin = {
  manifest: {
    key: "company-ops",
    version: "0.1.0",
    displayName: { en: "Company Ops", ja: "会社運営コンダクター" },
    subscribe: [
      EventTypes.CompanyOpsTick,
      EventTypes.ContentPendingApproval,
    ],
    publish: [
      EventTypes.ResearchScoutRequested,
      EventTypes.ArticleGenerateRequested,
      EventTypes.AffiliateOptimizeRequested,
      EventTypes.SnsAutoOpsTick,
      EventTypes.AnalyticsDailyRequested,
      EventTypes.ContentImproveRequested,
      EventTypes.TrendPredictRequested,
      EventTypes.SelfHealingTick,
      EventTypes.ContentApproved,
      EventTypes.VideoRenderRequested,
    ],
    capabilities: [
      "company_conductor",
      "full_auto_loop",
      "auto_approve_tools",
    ],
  },

  async handle(ctx, event) {
    const settings = await loadCompanyOpsSettings();

    if (event.type === EventTypes.ContentPendingApproval) {
      const data = parseEvent(event, ContentPendingApprovalDataSchema).data;
      if (
        settings.mode === "full_auto" &&
        settings.autoApproveTools &&
        !settings.emergencyStop
      ) {
        await ctx.publish(
          createEvent({
            type: EventTypes.ContentApproved,
            source: "agent:company-ops",
            dataschema: "https://ai-base.local/schemas/content.approved.v1.json",
            correlationid: event.correlationid,
            causationid: event.id,
            data: {
              draftId: data.draftId,
              workflowId: data.workflowId,
              approvalId: `auto-${data.draftId}`,
              reviewerId: "company-ops-auto",
              comment: "Auto-approved by company full_auto mode",
            },
          }),
        );
        await ctx.logger.info("Auto-approved tool draft (full_auto company mode)", {
          draftId: data.draftId,
        });
      }
      return;
    }

    if (event.type !== EventTypes.CompanyOpsTick) return;
    parseEvent(event, CompanyOpsTickDataSchema);

    if (settings.mode === "paused" || settings.emergencyStop) {
      await ctx.logger.info("Company ops skipped (paused or emergency stop)");
      return;
    }

    const corr = event.correlationid;

    if (settings.researchEnabled) {
      await ctx.publish(
        createEvent({
          type: EventTypes.ResearchScoutRequested,
          source: "agent:company-ops",
          dataschema: "https://ai-base.local/schemas/research.scout.requested.v1.json",
          correlationid: corr,
          causationid: event.id,
          data: {
            sources: settings.researchSources,
            limit: settings.researchDailyLimit,
            locale: "ja" as const,
          },
        }),
      );
    }

    if (settings.trendPredictEnabled) {
      await ctx.publish(
        createEvent({
          type: EventTypes.TrendPredictRequested,
          source: "agent:company-ops",
          dataschema: "https://ai-base.local/schemas/trend.predict.requested.v1.json",
          correlationid: corr,
          causationid: event.id,
          data: { limit: 5 },
        }),
      );
    }

    if (settings.seoArticlesEnabled) {
      for (const kind of settings.articleKindsPerTool.slice(0, 3)) {
        await ctx.publish(
          createEvent({
            type: EventTypes.ArticleGenerateRequested,
            source: "agent:company-ops",
            dataschema:
              "https://ai-base.local/schemas/content.article.generate.requested.v1.json",
            correlationid: corr,
            causationid: event.id,
            data: {
              kind: kind as
                | "recommend"
                | "compare"
                | "howto"
                | "ranking"
                | "news"
                | "usecase"
                | "guide"
                | "faq"
                | "beginner",
              toolSlugs: [],
              autoPublish: settings.autoPublishArticles,
              locale: "ja" as const,
            },
          }),
        );
      }
    }

    if (settings.affiliateOptimizeEnabled) {
      await ctx.publish(
        createEvent({
          type: EventTypes.AffiliateOptimizeRequested,
          source: "agent:company-ops",
          dataschema:
            "https://ai-base.local/schemas/affiliate.optimize.requested.v1.json",
          correlationid: corr,
          causationid: event.id,
          data: { reason: "cron" as const },
        }),
      );
    }

    if (settings.snsEnabled) {
      await ctx.publish(
        createEvent({
          type: EventTypes.SnsAutoOpsTick,
          source: "agent:company-ops",
          dataschema: "https://ai-base.local/schemas/sns-auto-ops-tick.json",
          correlationid: corr,
          causationid: event.id,
          data: { reason: "cron" as const },
        }),
      );
    }

    if (settings.videoEnabled) {
      await ctx.publish(
        createEvent({
          type: EventTypes.VideoRenderRequested,
          source: "agent:company-ops",
          dataschema: "https://ai-base.local/schemas/video.render.requested.v1.json",
          correlationid: corr,
          causationid: event.id,
          data: {
            durationSec: 30 as const,
            platform: "tiktok",
          },
        }),
      );
    }

    if (settings.analyticsEnabled) {
      await ctx.publish(
        createEvent({
          type: EventTypes.AnalyticsDailyRequested,
          source: "agent:company-ops",
          dataschema: "https://ai-base.local/schemas/analytics.daily.requested.v1.json",
          correlationid: corr,
          causationid: event.id,
          data: { windowHours: 24 },
        }),
      );
    }

    if (settings.autoImproveEnabled) {
      await ctx.publish(
        createEvent({
          type: EventTypes.ContentImproveRequested,
          source: "agent:company-ops",
          dataschema:
            "https://ai-base.local/schemas/content.improve.requested.v1.json",
          correlationid: corr,
          causationid: event.id,
          data: {
            targetType: "article" as const,
            targetId: "auto",
            reason: "daily_scan",
          },
        }),
      );
    }

    // Safety / self-healing tick every company day
    await ctx.publish(
      createEvent({
        type: EventTypes.SelfHealingTick,
        source: "agent:company-ops",
        dataschema: "https://ai-base.local/schemas/self_healing.tick.v1.json",
        correlationid: corr,
        causationid: event.id,
        data: { reason: "cron" as const },
      }),
    );

    await ctx.logger.info("Company ops tick fan-out complete", {
      brand: settings.activeSiteBrandKey,
      mode: settings.mode,
    });
  },
};
