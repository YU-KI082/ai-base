import { cosineSimilarity } from "@ai-base/embeddings";
import type {
  VectorMatch,
  VectorPoint,
  VectorQuery,
  VectorStore,
} from "./types.js";

/** In-process store for unit tests and local offline RAG. */
export class InMemoryVectorStore implements VectorStore {
  readonly name = "memory";
  private readonly namespaces = new Map<string, Map<string, VectorPoint>>();

  private bucket(namespace = "default") {
    let map = this.namespaces.get(namespace);
    if (!map) {
      map = new Map();
      this.namespaces.set(namespace, map);
    }
    return map;
  }

  async upsert(points: VectorPoint[], namespace = "default"): Promise<void> {
    const bucket = this.bucket(namespace);
    for (const point of points) {
      bucket.set(point.id, point);
    }
  }

  async query(query: VectorQuery): Promise<VectorMatch[]> {
    const bucket = this.bucket(query.namespace ?? "default");
    const topK = query.topK ?? 8;
    const scored: VectorMatch[] = [];
    for (const point of bucket.values()) {
      if (query.filter) {
        const ok = Object.entries(query.filter).every(
          ([k, v]) => point.payload?.[k] === v,
        );
        if (!ok) continue;
      }
      scored.push({
        id: point.id,
        score: cosineSimilarity(query.embedding, point.embedding),
        payload: point.payload,
      });
    }
    return scored.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  async delete(ids: string[], namespace = "default"): Promise<void> {
    const bucket = this.bucket(namespace);
    for (const id of ids) bucket.delete(id);
  }
}
