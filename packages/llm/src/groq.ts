import { OpenAiCompatibleProvider } from "./openai-compatible.js";
import type { LlmProviderConfig } from "./types.js";

/**
 * Groq — OpenAI-compatible Chat Completions API (free tier friendly).
 * https://console.groq.com
 */
export class GroqProvider extends OpenAiCompatibleProvider {
  constructor(config: LlmProviderConfig = {}) {
    super(
      "groq",
      config.apiKey ?? process.env.GROQ_API_KEY ?? "",
      config.model ?? process.env.LLM_MODEL ?? "llama-3.3-70b-versatile",
      config.baseUrl ?? process.env.GROQ_BASE_URL ?? "https://api.groq.com/openai/v1",
      true,
    );
  }
}
