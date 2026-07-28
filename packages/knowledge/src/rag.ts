import { createHash } from "node:crypto";
import { ulid } from "ulid";
import {
  repos,
  type KnowledgeDocumentRepository,
  type Repositories,
} from "@ai-base/database";
import {
  createEmbeddingProvider,
  type EmbeddingProvider,
} from "@ai-base/embeddings";
import { createVectorStore, type VectorStore } from "@ai-base/vector";

export type RagHit = {
  chunkId: string;
  documentId: string;
  content: string;
  score: number;
  title?: string;
  metadata?: Record<string, unknown>;
};

function chunkText(content: string, maxChars = 800): string[] {
  const paragraphs = content.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";
  for (const paragraph of paragraphs) {
    if ((current + "\n\n" + paragraph).length > maxChars && current) {
      chunks.push(current);
      current = paragraph;
    } else {
      current = current ? `${current}\n\n${paragraph}` : paragraph;
    }
  }
  if (current) chunks.push(current);
  if (!chunks.length && content.trim()) chunks.push(content.trim().slice(0, maxChars));
  return chunks;
}

/**
 * RAG pipeline: documents → chunks → embeddings → VectorStore → retrieval.
 * Embedding provider and vector backend are swappable via factories.
 */
export class RagService {
  constructor(
    private readonly embeddings: EmbeddingProvider = createEmbeddingProvider(),
    private readonly vectors: VectorStore = createVectorStore(
      process.env.VECTOR_BACKEND === "memory" ? "memory" : process.env.VECTOR_BACKEND,
    ),
    private readonly documents: KnowledgeDocumentRepository = repos.knowledgeDocuments,
    private readonly namespace = process.env.VECTOR_NAMESPACE ?? "knowledge",
  ) {}

  async ingestDocument(input: {
    title: string;
    content: string;
    sourceType: string;
    sourceId?: string;
    nodeId?: string;
    locale?: "en" | "ja" | null;
    metadata?: Record<string, unknown>;
  }) {
    const doc = await this.documents.create({
      title: input.title,
      content: input.content,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      nodeId: input.nodeId,
      locale: input.locale ?? null,
      metadata: (input.metadata ?? {}) as never,
    });

    const pieces = chunkText(input.content);
    const embedded = await this.embeddings.embed({ texts: pieces });
    const points = [];

    for (let i = 0; i < pieces.length; i++) {
      const vectorId = ulid();
      const content = pieces[i] ?? "";
      await this.documents.addChunk({
        documentId: doc.id,
        chunkIndex: i,
        content,
        tokenCount: Math.ceil(content.length / 4),
        vectorId,
        embeddingProvider: embedded.provider,
        embeddingModel: embedded.model,
        dimensions: embedded.dimensions,
        metadata: {
          title: input.title,
          sourceType: input.sourceType,
          sourceId: input.sourceId,
        },
      });
      points.push({
        id: vectorId,
        embedding: embedded.embeddings[i] ?? [],
        payload: {
          documentId: doc.id,
          chunkIndex: i,
          title: input.title,
          sourceType: input.sourceType,
        },
      });
    }

    await this.vectors.upsert(points, this.namespace);
    return { documentId: doc.id, chunks: pieces.length };
  }

  async retrieve(query: string, topK = 6): Promise<RagHit[]> {
    const embedded = await this.embeddings.embed({ texts: [query] });
    const vector = embedded.embeddings[0];
    if (!vector) return [];
    const matches = await this.vectors.query({
      embedding: vector,
      topK,
      namespace: this.namespace,
    });
    const chunks = await this.documents.findChunksByVectorIds(
      matches.map((m) => m.id),
    );
    const byVector = new Map(
      chunks
        .filter((c) => Boolean(c.vectorId))
        .map((c) => [c.vectorId as string, c]),
    );
    const hits: RagHit[] = [];
    for (const m of matches) {
      const chunk = byVector.get(m.id);
      if (!chunk) continue;
      hits.push({
        chunkId: chunk.id,
        documentId: chunk.documentId,
        content: chunk.content,
        score: m.score,
        title: chunk.document.title,
        metadata: chunk.metadata as Record<string, unknown>,
      });
    }
    return hits;
  }

  async contextPrompt(query: string, topK = 6): Promise<string> {
    const hits = await this.retrieve(query, topK);
    if (!hits.length) return "No retrieved knowledge.";
    return hits
      .map(
        (h, i) =>
          `[#${i + 1} score=${h.score.toFixed(3)} ${h.title ?? "untitled"}]\n${h.content}`,
      )
      .join("\n\n");
  }

  /** Stable id helper for deterministic tests */
  static hashId(input: string): string {
    return createHash("sha256").update(input).digest("hex").slice(0, 26);
  }
}

export function createRagService(options?: {
  embeddings?: EmbeddingProvider;
  vectors?: VectorStore;
  repositories?: Repositories;
}) {
  return new RagService(
    options?.embeddings ?? createEmbeddingProvider(),
    options?.vectors ??
      createVectorStore(
        process.env.VECTOR_BACKEND === "memory"
          ? "memory"
          : process.env.VECTOR_BACKEND,
      ),
    options?.repositories?.knowledgeDocuments ?? repos.knowledgeDocuments,
  );
}
