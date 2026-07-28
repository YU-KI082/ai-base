import { z } from "zod";
import { ulid } from "ulid";

export const LocaleSchema = z.enum(["en", "ja"]);

export const AiBaseEventSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  source: z.string().min(1),
  specversion: z.literal("1.0"),
  time: z.string().datetime(),
  datacontenttype: z.literal("application/json"),
  dataschema: z.string().min(1),
  subject: z.string().optional(),
  correlationid: z.string().min(1),
  causationid: z.string().optional(),
  locale: LocaleSchema.optional(),
  data: z.unknown(),
});

export type AiBaseEvent<T = unknown> = Omit<
  z.infer<typeof AiBaseEventSchema>,
  "data"
> & { data: T };

export const EventTypes = {
  IngestManualRequested: "ingest.manual.requested.v1",
  ToolCandidateCreated: "tool.candidate.created.v1",
  ToolReviewed: "tool.reviewed.v1",
  ContentDraftGenerated: "content.draft.generated.v1",
  ContentAssetsReady: "content.assets.ready.v1",
  ContentTranslated: "content.translated.v1",
  ContentSeoReady: "content.seo.ready.v1",
  ContentPendingApproval: "content.pending_approval.v1",
  ContentApproved: "content.approved.v1",
  ContentRejected: "content.rejected.v1",
  ContentPublished: "content.published.v1",
  AgentRunStarted: "agent.run.started.v1",
  AgentRunCompleted: "agent.run.completed.v1",
  AgentRunFailed: "agent.run.failed.v1",
  AffiliateIntelRequested: "affiliate.intel.requested.v1",
  AffiliateIntelRegistered: "affiliate.intel.registered.v1",
  SnsTrendScoutRequested: "sns.trend.scout.requested.v1",
  SnsTrendObserved: "sns.trend.observed.v1",
  SnsPatternsAnalyzeRequested: "sns.patterns.analyze.requested.v1",
  SnsPatternsReady: "sns.patterns.ready.v1",
  SnsExperimentPlanRequested: "sns.experiment.plan.requested.v1",
  SnsExperimentCreated: "sns.experiment.created.v1",
  SnsRecommendRequested: "sns.recommend.requested.v1",
  SnsRecommendationsReady: "sns.recommendations.ready.v1",
  SnsPostScoreRequested: "sns.post.score.requested.v1",
  SnsFeedbackTick: "sns.feedback.tick.v1",
  SnsMetricsIngestRequested: "sns.metrics.ingest.requested.v1",
  SnsLearningUpdated: "sns.learning.updated.v1",
  SnsOAuthRefreshTick: "sns.oauth.refresh.tick.v1",
  SnsOAuthReauthRequired: "sns.oauth.reauth.required.v1",
  SnsPostPublishRequested: "sns.post.publish.requested.v1",
  SnsPostPublishedExternal: "sns.post.published.external.v1",
  SnsAutoOpsTick: "sns.auto_ops.tick.v1",
  SnsAutoOpsAlert: "sns.auto_ops.alert.v1",
  SelfHealingTick: "self_healing.tick.v1",
  SelfHealingErrorReported: "self_healing.error.reported.v1",
  SelfHealingResolved: "self_healing.resolved.v1",
  SelfHealingNeedsApproval: "self_healing.needs_approval.v1",
} as const;

export type EventType = (typeof EventTypes)[keyof typeof EventTypes];

export const ToolCandidateCreatedDataSchema = z.object({
  candidateId: z.string(),
  workflowId: z.string(),
  name: z.string(),
  homepageUrl: z.string().min(1),
  sourceName: z.string(),
  sourceUrl: z.string().url().optional(),
  externalId: z.string().optional(),
  description: z.string().optional(),
  categoryHints: z.array(z.string()).default([]),
});

export const ToolReviewedDataSchema = z.object({
  candidateId: z.string(),
  workflowId: z.string(),
  passed: z.boolean(),
  reasons: z.array(z.string()).default([]),
  suggestedCategoryKeys: z.array(z.string()).default([]),
  duplicateToolId: z.string().optional(),
});

export const ContentDraftGeneratedDataSchema = z.object({
  draftId: z.string(),
  workflowId: z.string(),
  candidateId: z.string(),
  slug: z.string(),
  locales: z.array(LocaleSchema),
});

export const ContentAssetsReadyDataSchema = z.object({
  draftId: z.string(),
  workflowId: z.string(),
  media: z.array(
    z.object({
      type: z.enum(["screenshot", "video", "logo", "ogp", "thumbnail"]),
      url: z.string(),
      alt: z.string().optional(),
    }),
  ),
});

export const ContentTranslatedDataSchema = z.object({
  draftId: z.string(),
  workflowId: z.string(),
  locales: z.array(LocaleSchema),
  completedLocales: z.array(LocaleSchema),
});

export const ContentSeoReadyDataSchema = z.object({
  draftId: z.string(),
  workflowId: z.string(),
});

export const ContentPendingApprovalDataSchema = z.object({
  draftId: z.string(),
  workflowId: z.string(),
});

export const ContentApprovedDataSchema = z.object({
  draftId: z.string(),
  workflowId: z.string(),
  approvalId: z.string(),
  reviewerId: z.string().optional(),
  comment: z.string().optional(),
});

export const ContentRejectedDataSchema = z.object({
  draftId: z.string(),
  workflowId: z.string(),
  approvalId: z.string(),
  reviewerId: z.string().optional(),
  comment: z.string().optional(),
});

export const ContentPublishedDataSchema = z.object({
  draftId: z.string(),
  workflowId: z.string(),
  toolId: z.string(),
  slug: z.string(),
});

export const AffiliateIntelRequestedDataSchema = z.object({
  toolId: z.string().optional(),
  backfillAll: z.boolean().default(false),
});

export const AffiliateIntelRegisteredDataSchema = z.object({
  toolId: z.string(),
  intelligenceId: z.string(),
  leadCount: z.number().int().nonnegative(),
  status: z.string(),
});

export const SnsTrendScoutRequestedDataSchema = z.object({
  platforms: z.array(z.enum(["instagram", "tiktok"])).default(["instagram", "tiktok"]),
  locales: z.array(LocaleSchema).default(["en", "ja"]),
  useSeedCatalog: z.boolean().default(true),
});

export const SnsTrendObservedDataSchema = z.object({
  observationIds: z.array(z.string()),
  count: z.number().int().nonnegative(),
});

export const SnsPatternsAnalyzeRequestedDataSchema = z.object({
  platform: z.enum(["instagram", "tiktok"]).optional(),
  locale: LocaleSchema.optional(),
});

export const SnsPatternsReadyDataSchema = z.object({
  patternIds: z.array(z.string()),
  count: z.number().int().nonnegative(),
});

export const SnsExperimentPlanRequestedDataSchema = z.object({
  weekOf: z.string().optional(),
});

export const SnsExperimentCreatedDataSchema = z.object({
  experimentIds: z.array(z.string()),
});

export const SnsRecommendRequestedDataSchema = z.object({
  limit: z.number().int().positive().max(20).default(6),
});

export const SnsRecommendationsReadyDataSchema = z.object({
  recommendationIds: z.array(z.string()),
});

export const SnsPostScoreRequestedDataSchema = z.object({
  socialPostId: z.string(),
});

export const SnsFeedbackTickDataSchema = z.object({
  windowHours: z.union([z.literal(24), z.literal(72), z.literal(168)]),
  socialPostId: z.string().optional(),
});

export const SnsMetricsIngestRequestedDataSchema = z.object({
  socialPostId: z.string(),
  windowHours: z.union([z.literal(24), z.literal(72), z.literal(168)]),
  source: z.enum(["manual", "official_api"]).default("manual"),
  metrics: z.record(z.number().nonnegative().nullable()),
});

export const SnsLearningUpdatedDataSchema = z.object({
  learningRecordIds: z.array(z.string()),
});

export const SnsOAuthRefreshTickDataSchema = z.object({
  reason: z.enum(["cron", "manual", "pre_publish"]).default("cron"),
  provider: z.enum(["instagram", "tiktok"]).optional(),
});

export const SnsOAuthReauthRequiredDataSchema = z.object({
  provider: z.enum(["instagram", "tiktok"]),
  reason: z.string(),
});

export const SnsPostPublishRequestedDataSchema = z.object({
  socialPostId: z.string(),
  platform: z.string(),
  approvedBy: z.string().optional(),
});

export const SnsPostPublishedExternalDataSchema = z.object({
  socialPostId: z.string(),
  platform: z.string(),
  externalPostId: z.string(),
});

export const SnsAutoOpsTickDataSchema = z.object({
  reason: z.enum(["cron", "manual", "ramp"]).default("cron"),
});

export const SnsAutoOpsAlertDataSchema = z.object({
  kind: z.string(),
  title: z.string(),
  message: z.string(),
  provider: z.string().optional(),
  socialPostId: z.string().optional(),
});

export const SelfHealingTickDataSchema = z.object({
  reason: z.enum(["cron", "manual", "error"]).default("cron"),
  incidentId: z.string().optional(),
});

export const SelfHealingErrorReportedDataSchema = z.object({
  title: z.string().optional(),
  message: z.string(),
  kind: z.string().optional(),
  location: z.string().optional(),
  stack: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const SelfHealingResolvedDataSchema = z.object({
  incidentId: z.string(),
  status: z.string(),
  changedFiles: z.array(z.string()).default([]),
});

export const SelfHealingNeedsApprovalDataSchema = z.object({
  incidentId: z.string(),
  title: z.string(),
  reason: z.string(),
});

export function createEvent<T>(input: {
  type: string;
  source: string;
  dataschema: string;
  correlationid: string;
  causationid?: string;
  subject?: string;
  locale?: "en" | "ja";
  data: T;
  id?: string;
}): AiBaseEvent<T> {
  return {
    id: input.id ?? ulid(),
    type: input.type,
    source: input.source,
    specversion: "1.0",
    time: new Date().toISOString(),
    datacontenttype: "application/json",
    dataschema: input.dataschema,
    subject: input.subject,
    correlationid: input.correlationid,
    causationid: input.causationid,
    locale: input.locale,
    data: input.data,
  };
}

export function parseEvent<T>(
  raw: unknown,
  dataSchema?: z.ZodType<T>,
): AiBaseEvent<T> {
  const envelope = AiBaseEventSchema.parse(raw);
  const data = dataSchema ? dataSchema.parse(envelope.data) : (envelope.data as T);
  return { ...envelope, data };
}
