import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { InMemoryVectorStore } from "./memory.js";
import { listVectorBackends } from "./factory.js";

describe("vector store", () => {
  it("lists backends", () => {
    const ids = listVectorBackends();
    assert.ok(ids.includes("memory"));
    assert.ok(ids.includes("postgres"));
    assert.ok(ids.includes("pgvector"));
    assert.ok(ids.includes("qdrant"));
    assert.ok(ids.includes("pinecone"));
  });

  it("memory store ranks by cosine similarity", async () => {
    const store = new InMemoryVectorStore();
    await store.upsert([
      { id: "a", embedding: [1, 0, 0], payload: { label: "a" } },
      { id: "b", embedding: [0.9, 0.1, 0], payload: { label: "b" } },
      { id: "c", embedding: [0, 1, 0], payload: { label: "c" } },
    ]);
    const matches = await store.query({ embedding: [1, 0, 0], topK: 2 });
    assert.equal(matches[0]?.id, "a");
    assert.equal(matches.length, 2);
  });
});
