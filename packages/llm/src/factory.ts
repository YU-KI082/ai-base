import type { LlmProvider, LlmProviderConfig, LlmProviderId } from "./types.js";
import { normalizeProviderId } from "./types.js";
import { AnthropicProvider } from "./anthropic.js";
import { GeminiProvider } from "./gemini.js";
import { GroqProvider } from "./groq.js";
import { GrokProvider } from "./grok.js";
import { LocalLlmProvider } from "./local.js";
import { MockLlmProvider } from "./mock.js";
import { OpenAiProvider } from "./openai.js";

export type LlmProviderFactory = (config?: LlmProviderConfig) => LlmProvider;

const registry = new Map<LlmProviderId, LlmProviderFactory>([
  ["openai", (c) => new OpenAiProvider(c)],
  ["anthropic", (c) => AnthropicProvider.fromConfig(c)],
  ["claude", (c) => AnthropicProvider.fromConfig(c)],
  ["gemini", (c) => GeminiProvider.fromConfig(c)],
  ["groq", (c) => new GroqProvider(c)],
  ["grok", (c) => new GrokProvider(c)],
  ["local", (c) => new LocalLlmProvider(c)],
  ["mock", (c) => new MockLlmProvider(c)],
]);

/**
 * Register or replace a provider implementation (plugin extension point).
 */
export function registerLlmProvider(
  id: LlmProviderId,
  factory: LlmProviderFactory,
): void {
  registry.set(id, factory);
}

export function listLlmProviders(): LlmProviderId[] {
  return [...registry.keys()];
}

function hasCredentials(id: LlmProviderId, config: LlmProviderConfig): boolean {
  switch (id) {
    case "openai":
      return Boolean(config.apiKey ?? process.env.OPENAI_API_KEY);
    case "anthropic":
    case "claude":
      return Boolean(config.apiKey ?? process.env.ANTHROPIC_API_KEY);
    case "gemini":
      return Boolean(
        config.apiKey ?? process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY,
      );
    case "groq":
      return Boolean(config.apiKey ?? process.env.GROQ_API_KEY);
    case "grok":
      return Boolean(
        config.apiKey ?? process.env.GROK_API_KEY ?? process.env.XAI_API_KEY,
      );
    case "local":
    case "mock":
      return true;
    default:
      return false;
  }
}

/**
 * Resolve an LLM provider from config / env.
 * Agents must call this (or receive an injected LlmProvider) — never import vendors directly.
 *
 * Fallback: if the chosen cloud provider lacks credentials and LLM_FALLBACK_MOCK=true
 * (default in non-production), use MockLlmProvider so pipelines remain runnable offline.
 */
export function createLlmProvider(
  configOrProvider?: LlmProviderConfig | string,
): LlmProvider {
  const config: LlmProviderConfig =
    typeof configOrProvider === "string"
      ? { provider: configOrProvider }
      : (configOrProvider ?? {});

  const id = normalizeProviderId(config.provider);
  const factory = registry.get(id);
  if (!factory) {
    throw new Error(`No factory registered for LLM provider "${id}"`);
  }

  const allowMockFallback =
    process.env.NODE_ENV !== "production" &&
    process.env.LLM_FALLBACK_MOCK !== "false";

  if (!hasCredentials(id, config) && allowMockFallback && id !== "mock") {
    console.warn(
      `[llm] provider "${id}" missing credentials; falling back to mock`,
    );
    return new MockLlmProvider(config);
  }

  return factory(config);
}

export function createLlmProviderFromAgentConfig(
  agentConfig: Record<string, unknown> | null | undefined,
): LlmProvider {
  const llm = (agentConfig?.llm ?? {}) as LlmProviderConfig;
  const provider =
    (typeof agentConfig?.llmProvider === "string"
      ? agentConfig.llmProvider
      : undefined) ??
    llm.provider ??
    process.env.LLM_PROVIDER;
  const model =
    (typeof agentConfig?.llmModel === "string"
      ? agentConfig.llmModel
      : undefined) ?? llm.model;
  return createLlmProvider({
    ...llm,
    provider,
    model,
  });
}
