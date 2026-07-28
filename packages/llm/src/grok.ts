import { OpenAiCompatibleProvider } from "./openai-compatible.js";
import type { LlmProviderConfig } from "./types.js";

/** xAI Grok — OpenAI-compatible Chat Completions API */
export class GrokProvider extends OpenAiCompatibleProvider {
  constructor(config: LlmProviderConfig = {}) {
    super(
      "grok",
      config.apiKey ?? process.env.GROK_API_KEY ?? process.env.XAI_API_KEY ?? "",
      config.model ?? process.env.LLM_MODEL ?? "grok-2-latest",
      config.baseUrl ?? process.env.GROK_BASE_URL ?? "https://api.x.ai/v1",
      true,
    );
  }
}
