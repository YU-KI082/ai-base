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
