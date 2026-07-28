import type {
  LlmCompletionRequest,
  LlmCompletionResult,
  LlmProvider,
} from "./types.js";

/**
 * OpenAI Chat Completions–compatible transport.
 * Used by openai, grok (xAI), and local (Ollama / vLLM / LM Studio).
 */
export class OpenAiCompatibleProvider implements LlmProvider {
  constructor(
    readonly name: string,
    private readonly apiKey: string,
    private readonly defaultModel: string,
    private readonly baseUrl: string,
    private readonly requireApiKey = true,
  ) {}

  async complete(request: LlmCompletionRequest): Promise<LlmCompletionResult> {
    if (this.requireApiKey && !this.apiKey) {
      throw new Error(`${this.name.toUpperCase()}_API_KEY is not configured`);
    }
    const model = request.model ?? this.defaultModel;
    const endpoint = `${this.baseUrl.replace(/\/$/, "")}/chat/completions`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        temperature: request.temperature ?? 0.2,
        messages: request.messages,
        ...(request.responseFormat === "json"
          ? { response_format: { type: "json_object" } }
          : {}),
      }),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`${this.name} error ${response.status}: ${body}`);
    }
    const json = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const content = json.choices[0]?.message?.content ?? "";
    return {
      content,
      model,
      provider: this.name,
      tokensIn: json.usage?.prompt_tokens,
      tokensOut: json.usage?.completion_tokens,
    };
  }
}
