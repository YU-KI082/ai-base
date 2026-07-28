export type EmbeddingRequest = {
  texts: string[];
  model?: string;
};

export type EmbeddingResult = {
  embeddings: number[][];
  model: string;
  provider: string;
  dimensions: number;
};

export const EMBEDDING_PROVIDER_IDS = [
  "openai",
  "voyage",
  "cohere",
  "jina",
  "bge",
  "ollama",
  "mock",
] as const;

export type EmbeddingProviderId = (typeof EMBEDDING_PROVIDER_IDS)[number];

export type EmbeddingProviderConfig = {
  provider?: EmbeddingProviderId | string;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  dimensions?: number;
};

export interface EmbeddingProvider {
  readonly name: string;
  embed(request: EmbeddingRequest): Promise<EmbeddingResult>;
}

export function normalizeEmbeddingProviderId(
  id?: string | null,
): EmbeddingProviderId {
  const raw = (id ?? process.env.EMBEDDING_PROVIDER ?? "mock")
    .toLowerCase()
    .trim();
  if ((EMBEDDING_PROVIDER_IDS as readonly string[]).includes(raw)) {
    return raw as EmbeddingProviderId;
  }
  throw new Error(
    `Unknown embedding provider "${id}". Supported: ${EMBEDDING_PROVIDER_IDS.join(", ")}`,
  );
}

/** Cosine similarity for local ranking / tests */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
