import { OpenAiCompatibleProvider } from "./openai-compatible.js";
import type { LlmProviderConfig } from "./types.js";

/**
 * Local LLM via OpenAI-compatible endpoint (Ollama, vLLM, LM Studio, etc.).
 * Default: Ollama at http://127.0.0.1:11434/v1
 */
export class LocalLlmProvider extends OpenAiCompatibleProvider {
  constructor(config: LlmProviderConfig = {}) {
    super(
      "local",
      config.apiKey ?? process.env.LOCAL_LLM_API_KEY ?? "local",
      config.model ?? process.env.LLM_MODEL ?? "llama3.2",
      config.baseUrl ??
        process.env.LOCAL_LLM_BASE_URL ??
        "http://127.0.0.1:11434/v1",
      false,
    );
  }
}
