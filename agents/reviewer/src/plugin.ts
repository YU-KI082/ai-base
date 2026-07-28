import type { AgentPlugin } from "@ai-base/agents-sdk";
import {
  createEvent,
  EventTypes,
  parseEvent,
  ToolCandidateCreatedDataSchema,
  ToolReviewedDataSchema,
} from "@ai-base/events";

const CATEGORY_KEYS = new Set([
  "text",
  "image",
  "video",
  "audio",
  "coding",
  "marketing",
  "sales",
  "automation",
  "productivity",
  "design",
  "education",
]);

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export const reviewerPlugin: AgentPlugin = {
  manifest: {
    key: "reviewer",
    version: "0.1.0",
    displayName: { en: "Reviewer", ja: "レビュアー" },
    subscribe: [EventTypes.ToolCandidateCreated],
    publish: [EventTypes.ToolReviewed],
    capabilities: ["dedupe", "quality", "categorize"],
  },
  async handle(ctx, event) {
    const data = parseEvent(event, ToolCandidateCreatedDataSchema).data;
    await ctx.repos.workflows.markStep(data.workflowId, "reviewer", "running");

    const prior = await ctx.knowledge.memory.recall({
      agentKey: "reviewer",
      kinds: ["run_failure", "improvement", "observation"],
      take: 5,
    });
    if (prior.length) {
      await ctx.logger.info("recalled reviewer memories", {
        count: prior.length,
      });
    }

    const reasons: string[] = [];
    if (!data.name || data.name.trim().length < 2) {
      reasons.push("name_too_short");
    }
    if (!isValidHttpUrl(data.homepageUrl)) {
      reasons.push("invalid_homepage_url");
    }
    if ((data.description ?? "").length > 0 && (data.description ?? "").length < 10) {
      reasons.push("description_too_short");
    }

    const duplicate = await ctx.repos.tools.findDuplicate(
      data.homepageUrl,
      data.externalId,
    );
    if (duplicate) {
      reasons.push("duplicate_tool");
    }

    const suggestedCategoryKeys = (data.categoryHints ?? []).filter((key) =>
      CATEGORY_KEYS.has(key),
    );
    if (suggestedCategoryKeys.length === 0) {
      suggestedCategoryKeys.push("productivity");
    }

    const passed = reasons.length === 0;
    const outgoing = createEvent({
      type: EventTypes.ToolReviewed,
      source: "agent:reviewer",
      dataschema: "https://ai-base.local/schemas/tool.reviewed.v1.json",
      correlationid: event.correlationid,
      causationid: event.id,
      subject: data.candidateId,
      data: {
        candidateId: data.candidateId,
        workflowId: data.workflowId,
        passed,
        reasons,
        suggestedCategoryKeys,
        duplicateToolId: duplicate?.id,
      },
    });
    parseEvent(outgoing, ToolReviewedDataSchema);
    await ctx.publish(outgoing);

    await ctx.repos.workflows.markStep(
      data.workflowId,
      "reviewer",
      passed ? "completed" : "failed",
      passed ? undefined : reasons.join(","),
    );
    await ctx.repos.workflows.setState(
      data.workflowId,
      passed ? "writing" : "failed",
    );
    await ctx.repos.candidates.setStatus(
      data.candidateId,
      passed ? "reviewed" : "rejected",
    );
  },
};
