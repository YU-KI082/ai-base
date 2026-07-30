export type LlmMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LlmCompletionRequest = {
  messages: LlmMessage[];
  model?: string;
  temperature?: number;
  responseFormat?: "text" | "json";
};

export type LlmCompletionResult = {
  content: string;
  model: string;
  provider: string;
  tokensIn?: number;
  tokensOut?: number;
  costUsd?: number;
};

/**
 * Supported LLM backends. Agents depend only on LlmProvider — never on a vendor SDK.
 */
export const LLM_PROVIDER_IDS = [
  "openai",
  "anthropic",
  "claude", // alias of anthropic
  "gemini",
  "groq", // Groq Cloud (free-tier friendly)
  "grok", // xAI Grok
  "local",
  "mock",
] as const;

export type LlmProviderId = (typeof LLM_PROVIDER_IDS)[number];

export type LlmProviderConfig = {
  /** Provider id (openai | anthropic | claude | gemini | groq | grok | local | mock) */
  provider?: LlmProviderId | string;
  /** Default model for this provider */
  model?: string;
  /** API key override (otherwise env) */
  apiKey?: string;
  /**
   * Base URL override.
   * - openai: defaults to https://api.openai.com/v1
   * - groq: defaults to https://api.groq.com/openai/v1
   * - grok: defaults to https://api.x.ai/v1
   * - local: defaults to http://127.0.0.1:11434/v1 (Ollama-compatible)
   * - gemini: unused (uses Google generative language API)
   */
  baseUrl?: string;
  /** Optional Anthropic-compatible / OpenAI-compatible extras */
  temperature?: number;
};

export interface LlmProvider {
  readonly name: string;
  complete(request: LlmCompletionRequest): Promise<LlmCompletionResult>;
}

/** Default when LLM_PROVIDER is unset — free-tier friendly for verification. */
export const DEFAULT_LLM_PROVIDER: LlmProviderId = "gemini";

export function normalizeProviderId(id?: string | null): LlmProviderId {
  const raw = (id ?? process.env.LLM_PROVIDER ?? DEFAULT_LLM_PROVIDER)
    .toLowerCase()
    .trim();
  if (raw === "claude") return "anthropic";
  if ((LLM_PROVIDER_IDS as readonly string[]).includes(raw)) {
    return raw as LlmProviderId;
  }
  throw new Error(
    `Unknown LLM provider "${id}". Supported: ${LLM_PROVIDER_IDS.join(", ")}`,
  );
}

/** Sensible default model per provider when LLM_MODEL is unset. */
export function defaultModelForProvider(id: LlmProviderId): string {
  switch (id) {
    case "gemini":
      return "gemini-2.0-flash";
    case "groq":
      return "llama-3.3-70b-versatile";
    case "openai":
      return "gpt-4o-mini";
    case "anthropic":
    case "claude":
      return "claude-3-5-haiku-latest";
    case "grok":
      return "grok-2-latest";
    case "local":
      return "qwen3:8b";
    case "mock":
      return "mock";
    default:
      return "gemini-2.0-flash";
  }
}
