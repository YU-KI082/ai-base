import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { reviewerPlugin } from "./plugin.js";
import { createEvent, EventTypes } from "@ai-base/events";
import type { AgentContext } from "@ai-base/agents-sdk";

function mockCtx(overrides: Partial<AgentContext> = {}): AgentContext {
  const published: unknown[] = [];
  return {
    agentKey: "reviewer",
    runId: "run_1",
    correlationId: "corr_1",
    db: {} as AgentContext["db"],
    repos: {
      workflows: {
        markStep: async () => undefined,
        setState: async () => undefined,
      },
      tools: {
        findDuplicate: async () => null,
      },
      candidates: {
        setStatus: async () => undefined,
      },
      logs: { write: async () => undefined },
    } as unknown as AgentContext["repos"],
    llm: {
      name: "mock",
      complete: async () => ({
        content: "{}",
        model: "mock",
        provider: "mock",
      }),
    },
    knowledge: {
      memory: {
        recall: async () => [],
        recordSuccess: async () => undefined,
        recordFailure: async () => undefined,
        recordImprovement: async () => undefined,
        contextPrompt: async () => "",
        remember: async () => undefined,
      },
      graph: {
        contextForTool: async () => ({
          node: null,
          summary: "",
          related: [],
        }),
        upsertToolGraph: async () => undefined,
      },
      rag: {
        retrieve: async () => [],
        contextPrompt: async () => "",
        ingestDocument: async () => ({ documentId: "d", chunks: 0 }),
      },
      decisionContext: async () => "",
    } as unknown as AgentContext["knowledge"],
    logger: {
      info: async () => undefined,
      warn: async () => undefined,
      error: async () => undefined,
    },
    config: {},
    localeTargets: ["en", "ja"],
    publish: async (event) => {
      published.push(event);
      (mockCtx as unknown as { published: unknown[] }).published = published;
    },
    ...overrides,
  };
}

describe("reviewer plugin", () => {
  it("passes valid candidates", async () => {
    const published: unknown[] = [];
    const ctx = mockCtx({
      publish: async (event) => {
        published.push(event);
      },
    });
    await reviewerPlugin.handle(
      ctx,
      createEvent({
        type: EventTypes.ToolCandidateCreated,
        source: "test",
        dataschema: "test",
        correlationid: "c1",
        data: {
          candidateId: "cand_1",
          workflowId: "wf_1",
          name: "Notion AI",
          homepageUrl: "https://www.notion.so/product/ai",
          sourceName: "manual",
          categoryHints: ["productivity"],
        },
      }),
    );
    assert.equal(published.length, 1);
    const event = published[0] as { data: { passed: boolean } };
    assert.equal(event.data.passed, true);
  });

  it("rejects invalid URLs", async () => {
    const published: unknown[] = [];
    const ctx = mockCtx({
      publish: async (event) => {
        published.push(event);
      },
    });
    await reviewerPlugin.handle(
      ctx,
      createEvent({
        type: EventTypes.ToolCandidateCreated,
        source: "test",
        dataschema: "test",
        correlationid: "c2",
        data: {
          candidateId: "cand_2",
          workflowId: "wf_2",
          name: "Bad",
          homepageUrl: "not-a-url",
          sourceName: "manual",
          categoryHints: [],
        },
      }),
    );
    const event = published[0] as { data: { passed: boolean; reasons: string[] } };
    assert.equal(event.data.passed, false);
    assert.ok(event.data.reasons.includes("invalid_homepage_url"));
  });
});
