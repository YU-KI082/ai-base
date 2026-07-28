import type {
  EmbeddingProvider,
  EmbeddingProviderConfig,
  EmbeddingProviderId,
} from "./types.js";
import { normalizeEmbeddingProviderId } from "./types.js";
import { MockEmbeddingProvider } from "./mock.js";
import {
  BgeEmbeddingProvider,
  CohereEmbeddingProvider,
  JinaEmbeddingProvider,
  OllamaEmbeddingProvider,
  OpenAiEmbeddingProvider,
  VoyageEmbeddingProvider,
} from "./providers.js";

export type EmbeddingProviderFactory = (
  config?: EmbeddingProviderConfig,
) => EmbeddingProvider;

const registry = new Map<EmbeddingProviderId, EmbeddingProviderFactory>([
  ["openai", (c) => OpenAiEmbeddingProvider.fromConfig(c)],
  ["voyage", (c) => VoyageEmbeddingProvider.fromConfig(c)],
  ["cohere", (c) => CohereEmbeddingProvider.fromConfig(c)],
  ["jina", (c) => JinaEmbeddingProvider.fromConfig(c)],
  ["bge", (c) => BgeEmbeddingProvider.fromConfig(c)],
  ["ollama", (c) => OllamaEmbeddingProvider.fromConfig(c)],
  ["mock", (c) => MockEmbeddingProvider.fromConfig(c)],
]);

export function registerEmbeddingProvider(
  id: EmbeddingProviderId,
  factory: EmbeddingProviderFactory,
): void {
  registry.set(id, factory);
}

export function listEmbeddingProviders(): EmbeddingProviderId[] {
  return [...registry.keys()];
}

function hasCredentials(
  id: EmbeddingProviderId,
  config: EmbeddingProviderConfig,
): boolean {
  switch (id) {
    case "openai":
      return Boolean(config.apiKey ?? process.env.OPENAI_API_KEY);
    case "voyage":
      return Boolean(config.apiKey ?? process.env.VOYAGE_API_KEY);
    case "cohere":
      return Boolean(config.apiKey ?? process.env.COHERE_API_KEY);
    case "jina":
      return Boolean(config.apiKey ?? process.env.JINA_API_KEY);
    case "bge":
      return Boolean(
        config.apiKey ?? process.env.BGE_API_KEY ?? process.env.HF_TOKEN,
      );
    case "ollama":
    case "mock":
      return true;
    default:
      return false;
  }
}

export function createEmbeddingProvider(
  configOrProvider?: EmbeddingProviderConfig | string,
): EmbeddingProvider {
  const config: EmbeddingProviderConfig =
    typeof configOrProvider === "string"
      ? { provider: configOrProvider }
      : (configOrProvider ?? {});

  const id = normalizeEmbeddingProviderId(config.provider);
  const factory = registry.get(id);
  if (!factory) {
    throw new Error(`No factory registered for embedding provider "${id}"`);
  }

  const allowMockFallback =
    process.env.NODE_ENV !== "production" &&
    process.env.EMBEDDING_FALLBACK_MOCK !== "false";

  if (!hasCredentials(id, config) && allowMockFallback && id !== "mock") {
    console.warn(
      `[embeddings] provider "${id}" missing credentials; falling back to mock`,
    );
    return MockEmbeddingProvider.fromConfig(config);
  }

  return factory(config);
}
