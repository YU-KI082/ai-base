import { VectorRecordRepository } from "@ai-base/database";
import { cosineSimilarity } from "@ai-base/embeddings";
import type {
  VectorMatch,
  VectorPoint,
  VectorQuery,
  VectorStore,
} from "./types.js";

/**
 * Durable Postgres-backed store using JSON float arrays (`vector_records`).
 * Works without the pgvector extension. Suitable as default production path
 * until a specialized ANN backend is configured.
 */
export class PostgresVectorStore implements VectorStore {
  readonly name = "postgres";

  constructor(private readonly records = new VectorRecordRepository()) {}

  async upsert(points: VectorPoint[], namespace = "default"): Promise<void> {
    for (const point of points) {
      await this.records.upsert({
        id: point.id,
        namespace,
        embedding: point.embedding,
        payload: (point.payload ?? {}) as never,
      });
    }
  }

  async query(query: VectorQuery): Promise<VectorMatch[]> {
    const rows = await this.records.listByNamespace(
      query.namespace ?? "default",
    );
    const topK = query.topK ?? 8;
    const scored: VectorMatch[] = [];
    for (const row of rows) {
      const embedding = row.embedding as unknown as number[];
      const payload = row.payload as Record<string, unknown>;
      if (query.filter) {
        const ok = Object.entries(query.filter).every(
          ([k, v]) => payload[k] === v,
        );
        if (!ok) continue;
      }
      scored.push({
        id: row.id,
        score: cosineSimilarity(query.embedding, embedding),
        payload,
      });
    }
    return scored.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  async delete(ids: string[]): Promise<void> {
    for (const id of ids) {
      await this.records.delete(id);
    }
  }
}

/**
 * Alias for environments that enable the pgvector extension later.
 * Currently delegates to PostgresVectorStore; swap internals without
 * changing callers when native VECTOR columns are introduced.
 */
export class PgVectorStore implements VectorStore {
  readonly name = "pgvector";
  private readonly inner = new PostgresVectorStore();

  upsert(points: VectorPoint[], namespace?: string) {
    return this.inner.upsert(points, namespace);
  }
  query(query: VectorQuery) {
    return this.inner.query(query);
  }
  delete(ids: string[], _namespace?: string) {
    return this.inner.delete(ids);
  }
}
