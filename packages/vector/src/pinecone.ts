import type {
  VectorMatch,
  VectorPoint,
  VectorQuery,
  VectorStore,
} from "./types.js";

/**
 * Pinecone HTTP adapter (serverless / pod indexes).
 * Requires PINECONE_API_KEY + PINECONE_HOST (index host URL).
 */
export class PineconeVectorStore implements VectorStore {
  readonly name = "pinecone";

  constructor(
    private readonly apiKey = process.env.PINECONE_API_KEY ?? "",
    private readonly host = process.env.PINECONE_HOST ?? "",
  ) {}

  private headers(): Record<string, string> {
    if (!this.apiKey || !this.host) {
      throw new Error("PINECONE_API_KEY and PINECONE_HOST are required");
    }
    return {
      "Content-Type": "application/json",
      "Api-Key": this.apiKey,
    };
  }

  async upsert(points: VectorPoint[], namespace = "default"): Promise<void> {
    const response = await fetch(
      `${this.host.replace(/\/$/, "")}/vectors/upsert`,
      {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({
          namespace,
          vectors: points.map((p) => ({
            id: p.id,
            values: p.embedding,
            metadata: p.payload ?? {},
          })),
        }),
      },
    );
    if (!response.ok) {
      throw new Error(`pinecone upsert failed: ${await response.text()}`);
    }
  }

  async query(query: VectorQuery): Promise<VectorMatch[]> {
    const response = await fetch(`${this.host.replace(/\/$/, "")}/query`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        namespace: query.namespace ?? "default",
        vector: query.embedding,
        topK: query.topK ?? 8,
        includeMetadata: true,
        filter: query.filter,
      }),
    });
    if (!response.ok) {
      throw new Error(`pinecone query failed: ${await response.text()}`);
    }
    const json = (await response.json()) as {
      matches: Array<{
        id: string;
        score: number;
        metadata?: Record<string, unknown>;
      }>;
    };
    return json.matches.map((m) => ({
      id: m.id,
      score: m.score,
      payload: m.metadata,
    }));
  }

  async delete(ids: string[], namespace = "default"): Promise<void> {
    const response = await fetch(
      `${this.host.replace(/\/$/, "")}/vectors/delete`,
      {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({ ids, namespace }),
      },
    );
    if (!response.ok) {
      throw new Error(`pinecone delete failed: ${await response.text()}`);
    }
  }
}
