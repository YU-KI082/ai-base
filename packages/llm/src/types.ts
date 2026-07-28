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
  "grok",
  "local",
  "mock",
] as const;

export type LlmProviderId = (typeof LLM_PROVIDER_IDS)[number];

export type LlmProviderConfig = {
  /** Provider id (openai | anthropic | claude | gemini | grok | local | mock) */
  provider?: LlmProviderId | string;
  /** Default model for this provider */
  model?: string;
  /** API key override (otherwise env) */
  apiKey?: string;
  /**
   * Base URL override.
   * - openai: defaults to https://api.openai.com/v1
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

export function normalizeProviderId(id?: string | null): LlmProviderId {
  const raw = (id ?? process.env.LLM_PROVIDER ?? "openai").toLowerCase().trim();
  if (raw === "claude") return "anthropic";
  if ((LLM_PROVIDER_IDS as readonly string[]).includes(raw)) {
    return raw as LlmProviderId;
  }
  throw new Error(
    `Unknown LLM provider "${id}". Supported: ${LLM_PROVIDER_IDS.join(", ")}`,
  );
}
