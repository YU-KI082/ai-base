import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createLlmProvider,
  listLlmProviders,
  normalizeProviderId,
} from "./index.js";

describe("llm providers", () => {
  it("lists registered providers", () => {
    const ids = listLlmProviders();
    assert.ok(ids.includes("openai"));
    assert.ok(ids.includes("anthropic"));
    assert.ok(ids.includes("gemini"));
    assert.ok(ids.includes("groq"));
    assert.ok(ids.includes("grok"));
    assert.ok(ids.includes("local"));
    assert.ok(ids.includes("mock"));
  });

  it("normalizes claude alias to anthropic", () => {
    assert.equal(normalizeProviderId("claude"), "anthropic");
  });

  it("creates mock provider and completes", async () => {
    const llm = createLlmProvider({ provider: "mock" });
    const result = await llm.complete({
      messages: [{ role: "user", content: "hello" }],
      responseFormat: "json",
    });
    assert.equal(result.provider, "mock");
    assert.ok(result.content.includes("ok"));
  });
});
