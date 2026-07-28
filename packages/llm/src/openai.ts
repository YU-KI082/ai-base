import { OpenAiCompatibleProvider } from "./openai-compatible.js";
import type { LlmProviderConfig } from "./types.js";

export class OpenAiProvider extends OpenAiCompatibleProvider {
  constructor(config: LlmProviderConfig = {}) {
    super(
      "openai",
      config.apiKey ?? process.env.OPENAI_API_KEY ?? "",
      config.model ?? process.env.LLM_MODEL ?? "gpt-4o-mini",
      config.baseUrl ??
        process.env.OPENAI_BASE_URL ??
        "https://api.openai.com/v1",
      true,
    );
  }
}
