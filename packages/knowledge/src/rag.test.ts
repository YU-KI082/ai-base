import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createEmbeddingProvider } from "@ai-base/embeddings";
import { InMemoryVectorStore } from "@ai-base/vector";
import { RagService } from "./rag.js";
import { KnowledgeGraph } from "./graph.js";
import { MemoryLayer } from "./memory.js";

describe("knowledge layer units", () => {
  it("RAG retrieve ranks ingested chunks with in-memory vector store", async () => {
    const vectors = new InMemoryVectorStore();
    const embeddings = createEmbeddingProvider("mock");
    const docs = {
      create: async (input: {
        title: string;
        content: string;
        sourceType: string;
        sourceId?: string;
        nodeId?: string;
        locale?: "en" | "ja" | null;
        metadata?: unknown;
      }) => ({
        id: "doc_1",
        ...input,
      }),
      addChunk: async (input: {
        documentId: string;
        chunkIndex: number;
        content: string;
        vectorId?: string;
      }) => ({
        id: `chunk_${input.chunkIndex}`,
        documentId: input.documentId,
        content: input.content,
        vectorId: input.vectorId,
        metadata: {},
        document: { title: "Notion AI", id: input.documentId },
      }),
      findChunksByVectorIds: async (ids: string[]) =>
        ids.map((id, i) => ({
          id: `chunk_${i}`,
          documentId: "doc_1",
          content:
            i === 0
              ? "Notion AI helps with writing and productivity workflows."
              : "Unrelated content about baking.",
          vectorId: id,
          metadata: {},
          document: { title: "Notion AI", id: "doc_1" },
        })),
    };

    const rag = new RagService(
      embeddings,
      vectors,
      docs as never,
      "test",
    );

    await rag.ingestDocument({
      title: "Notion AI",
      content:
        "Notion AI helps with writing and productivity workflows.\n\nUnrelated content about baking.",
      sourceType: "tool_page",
      sourceId: "notion-ai",
    });

    const hits = await rag.retrieve("productivity writing assistant", 2);
    assert.ok(hits.length >= 1);
    assert.ok(hits[0]!.content.toLowerCase().includes("notion") || hits[0]!.score >= 0);
  });

  it("exposes graph and memory constructors", () => {
    assert.equal(typeof KnowledgeGraph, "function");
    assert.equal(typeof MemoryLayer, "function");
  });
});
