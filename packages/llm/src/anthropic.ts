import type {
  LlmCompletionRequest,
  LlmCompletionResult,
  LlmProvider,
  LlmProviderConfig,
} from "./types.js";

export class AnthropicProvider implements LlmProvider {
  readonly name = "anthropic";

  constructor(
    private readonly apiKey = process.env.ANTHROPIC_API_KEY ?? "",
    private readonly defaultModel =
      process.env.LLM_MODEL ?? "claude-3-5-haiku-latest",
    private readonly baseUrl =
      process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com",
  ) {}

  static fromConfig(config: LlmProviderConfig = {}): AnthropicProvider {
    return new AnthropicProvider(
      config.apiKey ?? process.env.ANTHROPIC_API_KEY ?? "",
      config.model ?? process.env.LLM_MODEL ?? "claude-3-5-haiku-latest",
      config.baseUrl ??
        process.env.ANTHROPIC_BASE_URL ??
        "https://api.anthropic.com",
    );
  }

  async complete(request: LlmCompletionRequest): Promise<LlmCompletionResult> {
    if (!this.apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }
    const model = request.model ?? this.defaultModel;
    const system = request.messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n");
    const messages = request.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role, content: m.content }));

    const response = await fetch(
      `${this.baseUrl.replace(/\/$/, "")}/v1/messages`,
      {
        method: "POST",
        headers: {
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          temperature: request.temperature ?? 0.2,
          system: system || undefined,
          messages,
        }),
      },
    );
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Anthropic error ${response.status}: ${body}`);
    }
    const json = (await response.json()) as {
      content: Array<{ type: string; text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const content = json.content
      .filter((c) => c.type === "text")
      .map((c) => c.text ?? "")
      .join("\n");
    return {
      content,
      model,
      provider: this.name,
      tokensIn: json.usage?.input_tokens,
      tokensOut: json.usage?.output_tokens,
    };
  }
}
