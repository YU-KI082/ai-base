import type {
  EmbeddingProvider,
  EmbeddingProviderConfig,
  EmbeddingRequest,
  EmbeddingResult,
} from "./types.js";

async function postEmbeddings(input: {
  url: string;
  headers: Record<string, string>;
  body: unknown;
  provider: string;
  model: string;
  parse: (json: unknown) => number[][];
}): Promise<EmbeddingResult> {
  const response = await fetch(input.url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...input.headers },
    body: JSON.stringify(input.body),
  });
  if (!response.ok) {
    throw new Error(
      `${input.provider} embedding error ${response.status}: ${await response.text()}`,
    );
  }
  const json = await response.json();
  const embeddings = input.parse(json);
  const dimensions = embeddings[0]?.length ?? 0;
  return {
    embeddings,
    model: input.model,
    provider: input.provider,
    dimensions,
  };
}

export class OpenAiEmbeddingProvider implements EmbeddingProvider {
  readonly name = "openai";

  constructor(
    private readonly apiKey = process.env.OPENAI_API_KEY ?? "",
    private readonly defaultModel =
      process.env.EMBEDDING_MODEL ?? "text-embedding-3-small",
    private readonly baseUrl =
      process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
  ) {}

  static fromConfig(c: EmbeddingProviderConfig = {}) {
    return new OpenAiEmbeddingProvider(
      c.apiKey ?? process.env.OPENAI_API_KEY ?? "",
      c.model ?? process.env.EMBEDDING_MODEL ?? "text-embedding-3-small",
      c.baseUrl ?? process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
    );
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResult> {
    if (!this.apiKey) throw new Error("OPENAI_API_KEY is not configured");
    const model = request.model ?? this.defaultModel;
    return postEmbeddings({
      url: `${this.baseUrl.replace(/\/$/, "")}/embeddings`,
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: { model, input: request.texts },
      provider: this.name,
      model,
      parse: (json) => {
        const data = json as { data: Array<{ embedding: number[] }> };
        return data.data.map((d) => d.embedding);
      },
    });
  }
}

export class VoyageEmbeddingProvider implements EmbeddingProvider {
  readonly name = "voyage";

  constructor(
    private readonly apiKey = process.env.VOYAGE_API_KEY ?? "",
    private readonly defaultModel =
      process.env.EMBEDDING_MODEL ?? "voyage-3",
    private readonly baseUrl =
      process.env.VOYAGE_BASE_URL ?? "https://api.voyageai.com/v1",
  ) {}

  static fromConfig(c: EmbeddingProviderConfig = {}) {
    return new VoyageEmbeddingProvider(
      c.apiKey ?? process.env.VOYAGE_API_KEY ?? "",
      c.model ?? process.env.EMBEDDING_MODEL ?? "voyage-3",
      c.baseUrl ?? process.env.VOYAGE_BASE_URL ?? "https://api.voyageai.com/v1",
    );
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResult> {
    if (!this.apiKey) throw new Error("VOYAGE_API_KEY is not configured");
    const model = request.model ?? this.defaultModel;
    return postEmbeddings({
      url: `${this.baseUrl.replace(/\/$/, "")}/embeddings`,
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: { model, input: request.texts },
      provider: this.name,
      model,
      parse: (json) => {
        const data = json as { data: Array<{ embedding: number[] }> };
        return data.data.map((d) => d.embedding);
      },
    });
  }
}

export class CohereEmbeddingProvider implements EmbeddingProvider {
  readonly name = "cohere";

  constructor(
    private readonly apiKey = process.env.COHERE_API_KEY ?? "",
    private readonly defaultModel =
      process.env.EMBEDDING_MODEL ?? "embed-english-v3.0",
    private readonly baseUrl =
      process.env.COHERE_BASE_URL ?? "https://api.cohere.com/v1",
  ) {}

  static fromConfig(c: EmbeddingProviderConfig = {}) {
    return new CohereEmbeddingProvider(
      c.apiKey ?? process.env.COHERE_API_KEY ?? "",
      c.model ?? process.env.EMBEDDING_MODEL ?? "embed-english-v3.0",
      c.baseUrl ?? process.env.COHERE_BASE_URL ?? "https://api.cohere.com/v1",
    );
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResult> {
    if (!this.apiKey) throw new Error("COHERE_API_KEY is not configured");
    const model = request.model ?? this.defaultModel;
    return postEmbeddings({
      url: `${this.baseUrl.replace(/\/$/, "")}/embed`,
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: {
        model,
        texts: request.texts,
        input_type: "search_document",
      },
      provider: this.name,
      model,
      parse: (json) => {
        const data = json as { embeddings: number[][] };
        return data.embeddings;
      },
    });
  }
}

export class JinaEmbeddingProvider implements EmbeddingProvider {
  readonly name = "jina";

  constructor(
    private readonly apiKey = process.env.JINA_API_KEY ?? "",
    private readonly defaultModel =
      process.env.EMBEDDING_MODEL ?? "jina-embeddings-v3",
    private readonly baseUrl =
      process.env.JINA_BASE_URL ?? "https://api.jina.ai/v1",
  ) {}

  static fromConfig(c: EmbeddingProviderConfig = {}) {
    return new JinaEmbeddingProvider(
      c.apiKey ?? process.env.JINA_API_KEY ?? "",
      c.model ?? process.env.EMBEDDING_MODEL ?? "jina-embeddings-v3",
      c.baseUrl ?? process.env.JINA_BASE_URL ?? "https://api.jina.ai/v1",
    );
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResult> {
    if (!this.apiKey) throw new Error("JINA_API_KEY is not configured");
    const model = request.model ?? this.defaultModel;
    return postEmbeddings({
      url: `${this.baseUrl.replace(/\/$/, "")}/embeddings`,
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: { model, input: request.texts },
      provider: this.name,
      model,
      parse: (json) => {
        const data = json as { data: Array<{ embedding: number[] }> };
        return data.data.map((d) => d.embedding);
      },
    });
  }
}

/**
 * BGE via HuggingFace Inference API or any OpenAI-compatible embeddings endpoint.
 * Set BGE_BASE_URL to your hosted BGE service.
 */
export class BgeEmbeddingProvider implements EmbeddingProvider {
  readonly name = "bge";

  constructor(
    private readonly apiKey =
      process.env.BGE_API_KEY ?? process.env.HF_TOKEN ?? "",
    private readonly defaultModel =
      process.env.EMBEDDING_MODEL ?? "BAAI/bge-m3",
    private readonly baseUrl =
      process.env.BGE_BASE_URL ??
      "https://api-inference.huggingface.co/pipeline/feature-extraction",
  ) {}

  static fromConfig(c: EmbeddingProviderConfig = {}) {
    return new BgeEmbeddingProvider(
      c.apiKey ?? process.env.BGE_API_KEY ?? process.env.HF_TOKEN ?? "",
      c.model ?? process.env.EMBEDDING_MODEL ?? "BAAI/bge-m3",
      c.baseUrl ??
        process.env.BGE_BASE_URL ??
        "https://api-inference.huggingface.co/pipeline/feature-extraction",
    );
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResult> {
    const model = request.model ?? this.defaultModel;
    const url = this.baseUrl.includes("huggingface")
      ? `${this.baseUrl.replace(/\/$/, "")}/${model}`
      : `${this.baseUrl.replace(/\/$/, "")}/embeddings`;

    if (this.baseUrl.includes("huggingface")) {
      const embeddings: number[][] = [];
      for (const text of request.texts) {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
          },
          body: JSON.stringify({ inputs: text }),
        });
        if (!response.ok) {
          throw new Error(
            `bge embedding error ${response.status}: ${await response.text()}`,
          );
        }
        const json = (await response.json()) as number[] | number[][];
        const vec = Array.isArray(json[0])
          ? averageRows(json as number[][])
          : (json as number[]);
        embeddings.push(vec);
      }
      return {
        embeddings,
        model,
        provider: this.name,
        dimensions: embeddings[0]?.length ?? 0,
      };
    }

    return postEmbeddings({
      url,
      headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {},
      body: { model, input: request.texts },
      provider: this.name,
      model,
      parse: (json) => {
        const data = json as { data: Array<{ embedding: number[] }> };
        return data.data.map((d) => d.embedding);
      },
    });
  }
}

function averageRows(rows: number[][]): number[] {
  if (!rows.length) return [];
  const dims = rows[0]?.length ?? 0;
  const out = new Array<number>(dims).fill(0);
  for (const row of rows) {
    for (let i = 0; i < dims; i++) out[i] = (out[i] ?? 0) + (row[i] ?? 0);
  }
  return out.map((v) => v / rows.length);
}

/** Ollama local embeddings (`POST /api/embeddings`) */
export class OllamaEmbeddingProvider implements EmbeddingProvider {
  readonly name = "ollama";

  constructor(
    private readonly defaultModel =
      process.env.EMBEDDING_MODEL ?? "nomic-embed-text",
    private readonly baseUrl =
      process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434",
  ) {}

  static fromConfig(c: EmbeddingProviderConfig = {}) {
    return new OllamaEmbeddingProvider(
      c.model ?? process.env.EMBEDDING_MODEL ?? "nomic-embed-text",
      c.baseUrl ?? process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434",
    );
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResult> {
    const model = request.model ?? this.defaultModel;
    const embeddings: number[][] = [];
    for (const text of request.texts) {
      const response = await fetch(
        `${this.baseUrl.replace(/\/$/, "")}/api/embeddings`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model, prompt: text }),
        },
      );
      if (!response.ok) {
        throw new Error(
          `ollama embedding error ${response.status}: ${await response.text()}`,
        );
      }
      const json = (await response.json()) as { embedding: number[] };
      embeddings.push(json.embedding);
    }
    return {
      embeddings,
      model,
      provider: this.name,
      dimensions: embeddings[0]?.length ?? 0,
    };
  }
}
