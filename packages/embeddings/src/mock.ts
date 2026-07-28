import type {
  EmbeddingProvider,
  EmbeddingProviderConfig,
  EmbeddingRequest,
  EmbeddingResult,
} from "./types.js";

/** Deterministic pseudo-embeddings for tests / offline RAG. */
export class MockEmbeddingProvider implements EmbeddingProvider {
  readonly name = "mock";

  constructor(
    private readonly dimensions =
      Number(process.env.EMBEDDING_DIMENSIONS ?? 64) || 64,
  ) {}

  static fromConfig(config: EmbeddingProviderConfig = {}): MockEmbeddingProvider {
    return new MockEmbeddingProvider(
      config.dimensions ?? (Number(process.env.EMBEDDING_DIMENSIONS ?? 64) || 64),
    );
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResult> {
    const embeddings = request.texts.map((text) => this.hashEmbed(text));
    return {
      embeddings,
      model: request.model ?? "mock-hash-v1",
      provider: this.name,
      dimensions: this.dimensions,
    };
  }

  private hashEmbed(text: string): number[] {
    const vec = new Array<number>(this.dimensions).fill(0);
    const normalized = text.toLowerCase();
    for (let i = 0; i < normalized.length; i++) {
      const code = normalized.charCodeAt(i);
      const idx = (code * (i + 1)) % this.dimensions;
      vec[idx] = (vec[idx] ?? 0) + 1;
    }
    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
    return vec.map((v) => v / norm);
  }
}
