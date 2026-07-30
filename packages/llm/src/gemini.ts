import type {
  LlmCompletionRequest,
  LlmCompletionResult,
  LlmProvider,
  LlmProviderConfig,
} from "./types.js";

/** Google Gemini via Generative Language API (REST) */
export class GeminiProvider implements LlmProvider {
  readonly name = "gemini";

  constructor(
    private readonly apiKey =
      process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? "",
    private readonly defaultModel =
      process.env.LLM_MODEL ?? "gemini-flash-latest",
    private readonly baseUrl =
      process.env.GEMINI_BASE_URL ??
      "https://generativelanguage.googleapis.com/v1beta",
  ) {}

  static fromConfig(config: LlmProviderConfig = {}): GeminiProvider {
    return new GeminiProvider(
      config.apiKey ?? process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? "",
      config.model ?? process.env.LLM_MODEL ?? "gemini-flash-latest",
      config.baseUrl ??
        process.env.GEMINI_BASE_URL ??
        "https://generativelanguage.googleapis.com/v1beta",
    );
  }

  async complete(request: LlmCompletionRequest): Promise<LlmCompletionResult> {
    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }
    const model = request.model ?? this.defaultModel;
    const system = request.messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n");
    const contents = request.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const url = `${this.baseUrl.replace(/\/$/, "")}/models/${model}:generateContent?key=${this.apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: system
          ? { parts: [{ text: system }] }
          : undefined,
        contents,
        generationConfig: {
          temperature: request.temperature ?? 0.2,
          ...(request.responseFormat === "json"
            ? { responseMimeType: "application/json" }
            : {}),
        },
      }),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Gemini error ${response.status}: ${body}`);
    }
    const json = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
      };
    };
    const content =
      json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ??
      "";
    return {
      content,
      model,
      provider: this.name,
      tokensIn: json.usageMetadata?.promptTokenCount,
      tokensOut: json.usageMetadata?.candidatesTokenCount,
    };
  }
}
