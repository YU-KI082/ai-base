import type { AgentPlugin } from "@ai-base/agents-sdk";
import { buildRevenueDashboard } from "@ai-base/company-ops";
import {
  AnalyticsDailyRequestedDataSchema,
  ContentPublishedDataSchema,
  EventTypes,
  createEvent,
  parseEvent,
} from "@ai-base/events";

export const analyticsPlugin: AgentPlugin = {
  manifest: {
    key: "analytics",
    version: "0.2.0",
    displayName: { en: "Analytics", ja: "アナリティクス" },
    subscribe: [
      EventTypes.ContentPublished,
      EventTypes.AnalyticsDailyRequested,
    ],
    publish: [EventTypes.AnalyticsDailyReady, EventTypes.ContentImproveRequested],
    capabilities: [
      "pv",
      "ctr",
      "cvr",
      "revenue",
      "rankings",
      "ga4",
      "gsc",
      "sns_analytics",
      "daily_improve",
    ],
  },
  async handle(ctx, event) {
    if (event.type === EventTypes.ContentPublished) {
      const data = parseEvent(event, ContentPublishedDataSchema).data;
      await ctx.db.analyticsEvent.create({
        data: {
          name: "content.published",
          properties: {
            toolId: data.toolId,
            slug: data.slug,
            draftId: data.draftId,
            workflowId: data.workflowId,
          },
        },
      });
      await ctx.logger.info("analytics event recorded", { toolId: data.toolId });
      return;
    }

    if (event.type !== EventTypes.AnalyticsDailyRequested) return;
    parseEvent(event, AnalyticsDailyRequestedDataSchema);
    const dash = await buildRevenueDashboard();
    const improvements: string[] = [];
    if (dash.today.conversions === 0 && dash.today.clicks > 0) {
      improvements.push("CTRありCVゼロ — CTAと遷移先を見直す");
    }
    if (dash.month.revenue === 0) {
      improvements.push("月次売上ゼロ — アフィリエイト案件とSNS導線を強化");
    }
    for (const s of dash.bySns) {
      if (s.plays > 200 && s.clicks === 0) {
        improvements.push(`${s.platform}: 再生多いがクリックゼロ — CTA強化`);
      }
    }

    const summaryId = `daily-${new Date().toISOString().slice(0, 10)}`;
    await ctx.db.analyticsEvent.create({
      data: {
        name: "analytics.daily",
        properties: {
          summaryId,
          revenue: dash.today.revenue,
          conversions: dash.today.conversions,
          improvements,
          roi: dash.roi,
        },
      },
    });

    await ctx.publish(
      createEvent({
        type: EventTypes.AnalyticsDailyReady,
        source: "agent:analytics",
        dataschema: "https://ai-base.local/schemas/analytics.daily.ready.v1.json",
        correlationid: event.correlationid,
        causationid: event.id,
        data: {
          summaryId,
          revenue: dash.today.revenue,
          clicks: dash.today.clicks,
          conversions: dash.today.conversions,
          improvements,
        },
      }),
    );

    if (improvements.length) {
      await ctx.publish(
        createEvent({
          type: EventTypes.ContentImproveRequested,
          source: "agent:analytics",
          dataschema:
            "https://ai-base.local/schemas/content.improve.requested.v1.json",
          correlationid: event.correlationid,
          causationid: event.id,
          data: {
            targetType: "article" as const,
            targetId: "auto",
            reason: improvements[0]!,
          },
        }),
      );
    }

    await ctx.logger.info("Daily analytics ready", {
      revenue: dash.today.revenue,
      improvements: improvements.length,
    });
  },
};
