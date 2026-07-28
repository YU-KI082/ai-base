import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  cosineSimilarity,
  createEmbeddingProvider,
  listEmbeddingProviders,
} from "./index.js";

describe("embeddings", () => {
  it("lists providers", () => {
    const ids = listEmbeddingProviders();
    for (const id of [
      "openai",
      "voyage",
      "cohere",
      "jina",
      "bge",
      "ollama",
      "mock",
    ]) {
      assert.ok(ids.includes(id as never));
    }
  });

  it("mock embeddings are deterministic and similar for similar text", async () => {
    const provider = createEmbeddingProvider("mock");
    const a = await provider.embed({ texts: ["Notion AI productivity"] });
    const b = await provider.embed({ texts: ["Notion AI productivity"] });
    const c = await provider.embed({ texts: ["unrelated quantum baking"] });
    assert.equal(a.dimensions, b.dimensions);
    assert.ok(
      cosineSimilarity(a.embeddings[0]!, b.embeddings[0]!) > 0.99,
    );
    assert.ok(
      cosineSimilarity(a.embeddings[0]!, c.embeddings[0]!) <
        cosineSimilarity(a.embeddings[0]!, b.embeddings[0]!),
    );
  });
});
