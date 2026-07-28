import type { AgentPlugin } from "@ai-base/agents-sdk";
import { TOOL_INGEST_STEPS } from "@ai-base/agents-sdk";
import {
  createEvent,
  EventTypes,
  parseEvent,
  ToolCandidateCreatedDataSchema,
} from "@ai-base/events";
import { randomUUID } from "node:crypto";

export type ScoutSourceInput = {
  name: string;
  homepageUrl: string;
  sourceName: string;
  sourceUrl?: string;
  externalId?: string;
  description?: string;
  categoryHints?: string[];
  raw?: Record<string, unknown>;
};

export const scoutPlugin: AgentPlugin = {
  manifest: {
    key: "scout",
    version: "0.1.0",
    displayName: { en: "Scout", ja: "スカウト" },
    subscribe: [EventTypes.IngestManualRequested],
    publish: [EventTypes.ToolCandidateCreated],
    capabilities: ["discover", "ingest"],
  },
  async handle(ctx, event) {
    const data = event.data as ScoutSourceInput;
    if (!data?.name || !data?.homepageUrl || !data?.sourceName) {
      throw new Error("scout requires name, homepageUrl, sourceName");
    }

    const correlationId = event.correlationid || randomUUID();

    const workflow = await ctx.repos.workflows.create({
      type: "tool_ingest",
      entityType: "tool_candidate",
      correlationId,
      localeTargets: ctx.localeTargets,
      metadata: { sourceName: data.sourceName },
      steps: TOOL_INGEST_STEPS.map((s) => ({
        agentKey: s.agentKey,
        stepKey: s.stepKey,
      })),
    });

    await ctx.repos.workflows.markStep(workflow.id, "scout", "running");

    const { candidate, created } = await ctx.repos.candidates.createIfNew({
      name: data.name,
      homepageUrl: data.homepageUrl,
      sourceName: data.sourceName,
      sourceUrl: data.sourceUrl,
      externalId: data.externalId,
      description: data.description,
      raw: (data.raw ?? {}) as import("@ai-base/database").Prisma.InputJsonValue,
      workflowId: workflow.id,
    });

    await ctx.db.workflow.update({
      where: { id: workflow.id },
      data: { entityId: candidate.id },
    });

    if (!created) {
      await ctx.repos.workflows.markStep(workflow.id, "scout", "completed");
      await ctx.repos.workflows.setState(workflow.id, "failed");
      await ctx.logger.warn("duplicate candidate fingerprint", {
        candidateId: candidate.id,
      });
      return;
    }

    const outgoing = createEvent({
      type: EventTypes.ToolCandidateCreated,
      source: "agent:scout",
      dataschema:
        "https://ai-base.local/schemas/tool.candidate.created.v1.json",
      correlationid: correlationId,
      causationid: event.id,
      subject: candidate.id,
      data: {
        candidateId: candidate.id,
        workflowId: workflow.id,
        name: candidate.name,
        homepageUrl: candidate.homepageUrl,
        sourceName: candidate.sourceName,
        sourceUrl: candidate.sourceUrl ?? undefined,
        externalId: candidate.externalId ?? undefined,
        description: candidate.description ?? undefined,
        categoryHints: data.categoryHints ?? [],
      },
    });
    parseEvent(outgoing, ToolCandidateCreatedDataSchema);

    await ctx.publish(outgoing);
    await ctx.repos.workflows.markStep(workflow.id, "scout", "completed");
    await ctx.repos.workflows.setState(workflow.id, "reviewing");
    await ctx.logger.info("candidate created", {
      candidateId: candidate.id,
      workflowId: workflow.id,
    });
  },
};
