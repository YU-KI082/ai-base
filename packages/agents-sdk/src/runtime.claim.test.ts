import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { processAgentEvent } from "./runtime.js";
import type { AgentPlugin } from "./types.js";
import { createEvent, EventTypes } from "@ai-base/events";

function mockRepos(overrides?: {
  claim?: boolean;
  status?: string;
}) {
  let claimed = false;
  let released = false;
  const status = overrides?.status ?? "active";
  return {
    released: () => released,
    claimed: () => claimed,
    repos: {
      consumptions: {
        tryClaim: async () => {
          if (overrides?.claim === false) return false;
          claimed = true;
          return true;
        },
        releaseClaim: async () => {
          released = true;
          claimed = false;
        },
      },
      agents: {
        findByKey: async () => ({
          key: "writer",
          status,
          config: {},
        }),
      },
      agentRuns: {
        start: async () => ({ id: "run-1" }),
        complete: async () => undefined,
        fail: async () => undefined,
      },
      logs: {
        write: async () => undefined,
      },
    },
  };
}

describe("processAgentEvent claim semantics", () => {
  it("releases claim when handler fails so retries can proceed", async () => {
    const { repos, released } = mockRepos();
    const plugin: AgentPlugin = {
      manifest: {
        key: "writer",
        version: "0.0.1",
        displayName: "Writer",
        description: "test",
        subscribe: [EventTypes.ToolReviewed],
        publish: [],
        capabilities: [],
      },
      handle: async () => {
        throw new Error("boom");
      },
    };

    const event = createEvent({
      type: EventTypes.ToolReviewed,
      source: "test",
      dataschema: "https://ai-base.local/schemas/test.json",
      correlationid: "c1",
      data: { workflowId: "w1", candidateId: "x", passed: true, reasons: [] },
    });

    await assert.rejects(() =>
      processAgentEvent({
        plugin,
        event,
        db: {} as never,
        repositories: repos as never,
        llm: { name: "mock", complete: async () => ({ text: "" }) } as never,
        knowledge: {
          memory: {
            recordSuccess: async () => undefined,
            recordFailure: async () => undefined,
          },
        } as never,
        agentId: "a1",
      }),
    );

    assert.equal(released(), true);
  });

  it("does not claim when agent is disabled", async () => {
    const { repos, claimed } = mockRepos({ status: "disabled" });
    const plugin: AgentPlugin = {
      manifest: {
        key: "writer",
        version: "0.0.1",
        displayName: "Writer",
        description: "test",
        subscribe: [EventTypes.ToolReviewed],
        publish: [],
        capabilities: [],
      },
      handle: async () => undefined,
    };
    const event = createEvent({
      type: EventTypes.ToolReviewed,
      source: "test",
      dataschema: "https://ai-base.local/schemas/test.json",
      correlationid: "c1",
      data: {},
    });

    await processAgentEvent({
      plugin,
      event,
      db: {} as never,
      repositories: repos as never,
      llm: { name: "mock" } as never,
      knowledge: { memory: {} } as never,
      agentId: "a1",
    });

    assert.equal(claimed(), false);
  });
});
