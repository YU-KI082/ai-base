import { createLlmProvider } from "@ai-base/llm";
import type { BrandMemory } from "./types.js";
import { aiEmployeeSystemPrompt } from "./persona.js";
import {
  assertTextLlmReady,
  OsAiUnavailableError,
  resolveTextLlmProviderId,
} from "./capabilities.js";

/** True when a real (non-mock) text LLM can be used. */
export function hasRealLlmCredentials(): boolean {
  return resolveTextLlmProviderId() !== null;
}

export function getOsLlm() {
  const id = assertTextLlmReady();
  return createLlmProvider({
    provider: id,
    model:
      process.env.LLM_MODEL ||
      (id === "local" ? "qwen3:8b" : undefined),
  });
}

function looksLikeMock(content: string): boolean {
  return /^Mock completion for:/i.test(content.trim());
}

/**
 * JSON completion via real LLM only.
 * Throws OsAiUnavailableError when not configured; never returns mock/heuristic JSON.
 */
export async function completeJson<T>(input: {
  brand: BrandMemory | null;
  userPrompt: string;
  improvementHistory?: string;
}): Promise<T> {
  assertTextLlmReady();
  const llm = getOsLlm();
  const result = await llm.complete({
    messages: [
      {
        role: "system",
        content: aiEmployeeSystemPrompt(input.brand, input.improvementHistory),
      },
      {
        role: "user",
        content: `${input.userPrompt}\n\n必ず有効な JSON のみを返してください。`,
      },
    ],
    temperature: 0.6,
    responseFormat: "json",
  });
  const raw = result.content.trim();
  if (!raw || looksLikeMock(raw)) {
    throw new OsAiUnavailableError("AI応答が不正です。しばらくして再試行してください。");
  }
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  const jsonText = start >= 0 && end > start ? raw.slice(start, end + 1) : raw;
  try {
    return JSON.parse(jsonText) as T;
  } catch {
    throw new OsAiUnavailableError("AI応答の解析に失敗しました。再試行してください。");
  }
}

/**
 * Text completion via real LLM only.
 */
export async function completeText(input: {
  brand: BrandMemory | null;
  userPrompt: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  improvementHistory?: string;
}): Promise<string> {
  assertTextLlmReady();
  const llm = getOsLlm();
  const history = (input.history ?? []).map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));
  const result = await llm.complete({
    messages: [
      {
        role: "system",
        content: aiEmployeeSystemPrompt(input.brand, input.improvementHistory),
      },
      ...history,
      { role: "user", content: input.userPrompt },
    ],
    temperature: 0.7,
  });
  const text = result.content.trim();
  if (!text || looksLikeMock(text)) {
    throw new OsAiUnavailableError("AI応答が空でした。再試行してください。");
  }
  // Strip common local-model think tags if present
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim() || text;
}
