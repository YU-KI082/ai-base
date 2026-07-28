import type {
  VectorMatch,
  VectorPoint,
  VectorQuery,
  VectorStore,
} from "./types.js";

/**
 * Qdrant HTTP adapter. Requires QDRANT_URL (and optional QDRANT_API_KEY).
 * Collection is ensured lazily on first upsert.
 */
export class QdrantVectorStore implements VectorStore {
  readonly name = "qdrant";

  constructor(
    private readonly url = process.env.QDRANT_URL ?? "http://127.0.0.1:6333",
    private readonly apiKey = process.env.QDRANT_API_KEY ?? "",
    private readonly collection =
      process.env.QDRANT_COLLECTION ?? "ai_base_knowledge",
  ) {}

  private headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      ...(this.apiKey ? { "api-key": this.apiKey } : {}),
    };
  }

  private async ensureCollection(dimensions: number): Promise<void> {
    const base = this.url.replace(/\/$/, "");
    const exists = await fetch(`${base}/collections/${this.collection}`, {
      headers: this.headers(),
    });
    if (exists.ok) return;
    const create = await fetch(`${base}/collections/${this.collection}`, {
      method: "PUT",
      headers: this.headers(),
      body: JSON.stringify({
        vectors: { size: dimensions, distance: "Cosine" },
      }),
    });
    if (!create.ok) {
      throw new Error(
        `qdrant create collection failed: ${await create.text()}`,
      );
    }
  }

  async upsert(points: VectorPoint[], namespace = "default"): Promise<void> {
    if (!points[0]) return;
    await this.ensureCollection(points[0].embedding.length);
    const response = await fetch(
      `${this.url.replace(/\/$/, "")}/collections/${this.collection}/points?wait=true`,
      {
        method: "PUT",
        headers: this.headers(),
        body: JSON.stringify({
          points: points.map((p) => ({
            id: p.id,
            vector: p.embedding,
            payload: { ...(p.payload ?? {}), namespace },
          })),
        }),
      },
    );
    if (!response.ok) {
      throw new Error(`qdrant upsert failed: ${await response.text()}`);
    }
  }

  async query(query: VectorQuery): Promise<VectorMatch[]> {
    const response = await fetch(
      `${this.url.replace(/\/$/, "")}/collections/${this.collection}/points/search`,
      {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({
          vector: query.embedding,
          limit: query.topK ?? 8,
          with_payload: true,
          filter: {
            must: [
              {
                key: "namespace",
                match: { value: query.namespace ?? "default" },
              },
              ...Object.entries(query.filter ?? {}).map(([key, value]) => ({
                key,
                match: { value },
              })),
            ],
          },
        }),
      },
    );
    if (!response.ok) {
      throw new Error(`qdrant query failed: ${await response.text()}`);
    }
    const json = (await response.json()) as {
      result: Array<{ id: string | number; score: number; payload?: Record<string, unknown> }>;
    };
    return json.result.map((r) => ({
      id: String(r.id),
      score: r.score,
      payload: r.payload,
    }));
  }

  async delete(ids: string[]): Promise<void> {
    const response = await fetch(
      `${this.url.replace(/\/$/, "")}/collections/${this.collection}/points/delete?wait=true`,
      {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({ points: ids }),
      },
    );
    if (!response.ok) {
      throw new Error(`qdrant delete failed: ${await response.text()}`);
    }
  }
}
