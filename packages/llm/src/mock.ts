import type {
  LlmCompletionRequest,
  LlmCompletionResult,
  LlmProvider,
  LlmProviderConfig,
} from "./types.js";

/**
 * Deterministic provider for tests and offline pipeline development.
 */
export class MockLlmProvider implements LlmProvider {
  readonly name = "mock";

  constructor(_config: LlmProviderConfig = {}) {}

  async complete(request: LlmCompletionRequest): Promise<LlmCompletionResult> {
    const user = request.messages.find((m) => m.role === "user")?.content ?? "";
    const content =
      request.responseFormat === "json"
        ? JSON.stringify({
            ok: true,
            echo: user.slice(0, 200),
            generatedAt: new Date().toISOString(),
          })
        : `Mock completion for: ${user.slice(0, 200)}`;
    return {
      content,
      model: "mock-1",
      provider: this.name,
      tokensIn: Math.ceil(user.length / 4),
      tokensOut: Math.ceil(content.length / 4),
      costUsd: 0,
    };
  }
}
